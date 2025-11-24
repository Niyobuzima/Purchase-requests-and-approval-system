"""
AI Document Processor for Invoice/Receipt Extraction
Supports OpenAI and Google Gemini with automatic fallback
"""

import os
import json
import requests
import time
from io import BytesIO
from typing import Dict, Optional, List

# OpenAI support
try:
    from openai import OpenAI
    OPENAI_SUPPORT = True
except ImportError:
    OPENAI_SUPPORT = False
    print("Warning: openai library not installed.")

# Google Gemini support
try:
    import google.generativeai as genai
    GEMINI_SUPPORT = True
except ImportError:
    GEMINI_SUPPORT = False
    print("Warning: google-generativeai library not installed.")


class AIProvider:
    """Base class for AI providers"""

    def __init__(self, name: str):
        self.name = name
        self.is_available = False

    def process_document(self, file_content: bytes, filename: str) -> Dict:
        raise NotImplementedError


class OpenAIProvider(AIProvider):
    """OpenAI GPT provider for document extraction"""

    def __init__(self):
        super().__init__("openai")
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4o')

        if OPENAI_SUPPORT and self.api_key:
            self.client = OpenAI(api_key=self.api_key)
            self.is_available = True
        else:
            self.client = None
            if not OPENAI_SUPPORT:
                print("OpenAI: Library not installed")
            elif not self.api_key:
                print("OpenAI: API key not configured")

    def process_document(self, file_content: bytes, filename: str) -> Dict:
        """Process document using OpenAI Responses API"""
        if not self.is_available:
            return {'error': 'OpenAI not available', 'success': False}

        try:
            # Get file extension
            file_extension = self._get_file_extension(filename)
            openai_filename = f"invoice{file_extension}"

            # Upload file to OpenAI
            print(f"[OpenAI] Uploading file: {openai_filename}")
            file_object = self.client.files.create(
                file=(openai_filename, BytesIO(file_content)),
                purpose='assistants'
            )

            # Build prompt
            prompt = self._get_extraction_prompt()

            # Determine file type
            image_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
            is_image = file_extension.lstrip('.').lower() in image_extensions

            print(f"[OpenAI] File type: {'image' if is_image else 'document'}")

            # Build content array
            content = [{"type": "input_text", "text": prompt}]

            if is_image:
                content.append({"type": "input_image", "file_id": file_object.id})
            else:
                content.append({"type": "input_file", "file_id": file_object.id})

            # Call Responses API
            print(f"[OpenAI] Calling model: {self.model}")
            response = self.client.responses.create(
                model=self.model,
                input=[{
                    "type": "message",
                    "role": "user",
                    "content": content
                }],
                text={"format": {"type": "json_object"}},
            )

            result = response.output_text

            # Cleanup
            try:
                self.client.files.delete(file_object.id)
            except Exception as e:
                print(f"[OpenAI] Cleanup warning: {e}")

            # Parse response
            extracted_data = self._parse_response(result)
            if extracted_data:
                extracted_data['success'] = True
                extracted_data['provider'] = 'openai'
                return extracted_data

            return {'error': 'Failed to parse response', 'success': False}

        except Exception as e:
            error_str = str(e).lower()
            # Check for quota/rate limit errors
            if 'quota' in error_str or 'rate' in error_str or '429' in error_str:
                print(f"[OpenAI] Quota/Rate limit error: {e}")
                return {'error': f'quota_exceeded: {e}', 'success': False, 'retry_with_fallback': True}

            print(f"[OpenAI] Error: {e}")
            import traceback
            traceback.print_exc()
            return {'error': str(e), 'success': False, 'retry_with_fallback': True}

    def _get_file_extension(self, filename: str) -> str:
        """Extract file extension"""
        if '.' in filename:
            return '.' + filename.rsplit('.', 1)[1].lower()
        return '.pdf'

    def _get_extraction_prompt(self) -> str:
        return """Extract the following information from the uploaded invoice/receipt document and return ONLY a valid JSON object.

Required JSON structure:
{
    "vendor_name": "string or null",
    "items": [
        {
            "description": "string",
            "quantity": number,
            "unit_price": number
        }
    ],
    "total_amount": number or null,
    "invoice_number": "string or null",
    "date": "YYYY-MM-DD or null"
}

Rules:
1. If you cannot find a field, set it to null
2. Ensure items array has at least one item if possible
3. quantity and unit_price should be numbers (not strings)
4. Return ONLY the JSON object, no markdown formatting, no additional text
5. Ensure the JSON is valid and parseable

Analyze the uploaded document carefully and extract all invoice information."""

    def _parse_response(self, response_text: str) -> Optional[Dict]:
        """Parse JSON response"""
        try:
            cleaned = response_text.strip()
            if cleaned.startswith('```json'):
                cleaned = cleaned[7:]
            elif cleaned.startswith('```'):
                cleaned = cleaned[3:]
            if cleaned.endswith('```'):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            data = json.loads(cleaned)

            # Ensure required fields
            data.setdefault('items', [])
            data.setdefault('vendor_name', None)
            data.setdefault('total_amount', None)
            data.setdefault('invoice_number', None)
            data.setdefault('date', None)

            return data
        except Exception as e:
            print(f"[OpenAI] Parse error: {e}")
            return None


class GeminiProvider(AIProvider):
    """Google Gemini provider for document extraction"""

    def __init__(self):
        super().__init__("gemini")
        self.api_key = os.getenv('GEMINI_API_KEY')
        self.model = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')

        if GEMINI_SUPPORT and self.api_key:
            genai.configure(api_key=self.api_key)
            self.is_available = True
        else:
            if not GEMINI_SUPPORT:
                print("Gemini: Library not installed")
            elif not self.api_key:
                print("Gemini: API key not configured")

    def process_document(self, file_content: bytes, filename: str) -> Dict:
        """Process document using Google Gemini with file upload"""
        if not self.is_available:
            return {'error': 'Gemini not available', 'success': False}

        try:
            # Get file extension and mime type
            file_extension = self._get_file_extension(filename)
            mime_type = self._get_mime_type(file_extension)

            print(f"[Gemini] Processing file: {filename} ({mime_type})")
            print(f"[Gemini] Using model: {self.model}")

            # Upload file to Gemini
            print("[Gemini] Uploading file...")
            uploaded_file = genai.upload_file(
                BytesIO(file_content),
                mime_type=mime_type,
                display_name=filename
            )

            # Wait for file to be processed
            print("[Gemini] Waiting for file processing...")
            while uploaded_file.state.name == "PROCESSING":
                time.sleep(1)
                uploaded_file = genai.get_file(uploaded_file.name)

            if uploaded_file.state.name == "FAILED":
                return {'error': 'Gemini file processing failed', 'success': False}

            print(f"[Gemini] File ready: {uploaded_file.uri}")

            # Create model and generate
            model = genai.GenerativeModel(self.model)
            prompt = self._get_extraction_prompt()

            print("[Gemini] Generating response...")
            response = model.generate_content(
                [uploaded_file, prompt],
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json"
                )
            )

            result = response.text

            # Cleanup uploaded file
            try:
                genai.delete_file(uploaded_file.name)
                print("[Gemini] File cleaned up")
            except Exception as e:
                print(f"[Gemini] Cleanup warning: {e}")

            # Parse response
            extracted_data = self._parse_response(result)
            if extracted_data:
                extracted_data['success'] = True
                extracted_data['provider'] = 'gemini'
                return extracted_data

            return {'error': 'Failed to parse Gemini response', 'success': False}

        except Exception as e:
            error_str = str(e).lower()
            if 'quota' in error_str or 'rate' in error_str or '429' in error_str:
                print(f"[Gemini] Quota/Rate limit error: {e}")
                return {'error': f'quota_exceeded: {e}', 'success': False}

            print(f"[Gemini] Error: {e}")
            import traceback
            traceback.print_exc()
            return {'error': str(e), 'success': False}

    def _get_file_extension(self, filename: str) -> str:
        """Extract file extension"""
        if '.' in filename:
            return '.' + filename.rsplit('.', 1)[1].lower()
        return '.pdf'

    def _get_mime_type(self, extension: str) -> str:
        """Get MIME type from extension"""
        mime_map = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
        }
        return mime_map.get(extension.lower(), 'application/pdf')

    def _get_extraction_prompt(self) -> str:
        return """Analyze this invoice/receipt document and extract the information into a JSON object.

Extract and return ONLY this JSON structure:
{
    "vendor_name": "string or null",
    "items": [
        {
            "description": "item description",
            "quantity": number,
            "unit_price": number
        }
    ],
    "total_amount": number or null,
    "invoice_number": "string or null",
    "date": "YYYY-MM-DD or null"
}

Important:
- Set fields to null if not found
- Include all line items you can identify
- quantity and unit_price must be numbers
- Return valid JSON only, no extra text"""

    def _parse_response(self, response_text: str) -> Optional[Dict]:
        """Parse JSON response"""
        try:
            cleaned = response_text.strip()
            if cleaned.startswith('```json'):
                cleaned = cleaned[7:]
            elif cleaned.startswith('```'):
                cleaned = cleaned[3:]
            if cleaned.endswith('```'):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            data = json.loads(cleaned)

            # Ensure required fields
            data.setdefault('items', [])
            data.setdefault('vendor_name', None)
            data.setdefault('total_amount', None)
            data.setdefault('invoice_number', None)
            data.setdefault('date', None)

            return data
        except Exception as e:
            print(f"[Gemini] Parse error: {e}")
            return None


class DocumentProcessor:
    """
    Document processor with automatic fallback between AI providers.
    Tries providers in order of priority until one succeeds.
    """

    def __init__(self):
        self.providers: List[AIProvider] = []
        self._init_providers()

    def _init_providers(self):
        """Initialize providers based on configuration"""
        priority = os.getenv('AI_PROVIDER_PRIORITY', 'openai,gemini')
        provider_order = [p.strip().lower() for p in priority.split(',')]

        available_providers = {
            'openai': OpenAIProvider,
            'gemini': GeminiProvider,
        }

        for provider_name in provider_order:
            if provider_name in available_providers:
                provider = available_providers[provider_name]()
                if provider.is_available:
                    self.providers.append(provider)
                    print(f"AI Provider initialized: {provider_name}")

        if not self.providers:
            print("Warning: No AI providers available!")

    def process_document_from_bytes(self, file_content: bytes, filename: str) -> Dict:
        """
        Process document from raw bytes with automatic fallback

        Args:
            file_content: Raw file bytes
            filename: Original filename

        Returns:
            Dict with extracted data
        """
        if not self.providers:
            return {
                'error': 'No AI providers configured. Please set OPENAI_API_KEY or GEMINI_API_KEY.',
                'success': False
            }

        errors = []

        for provider in self.providers:
            print(f"\n{'='*50}")
            print(f"Trying AI provider: {provider.name}")
            print(f"{'='*50}")

            result = provider.process_document(file_content, filename)

            if result.get('success'):
                print(f"✓ Success with {provider.name}")
                return result

            error = result.get('error', 'Unknown error')
            errors.append(f"{provider.name}: {error}")
            print(f"✗ Failed with {provider.name}: {error}")

            # Check if we should try fallback
            if not result.get('retry_with_fallback', True):
                print(f"Provider {provider.name} indicated no fallback needed")
                break

        # All providers failed
        return {
            'error': f'All AI providers failed. Errors: {"; ".join(errors)}',
            'success': False,
            'providers_tried': [p.name for p in self.providers]
        }

    def process_document_from_file(self, cloudinary_file) -> Dict:
        """
        Process document from Cloudinary file object

        Args:
            cloudinary_file: CloudinaryField instance

        Returns:
            Dict with extracted data
        """
        try:
            file_url = cloudinary_file.url

            # Ensure HTTPS
            if file_url.startswith('http://'):
                file_url = file_url.replace('http://', 'https://', 1)

            # Download file content
            print(f"Downloading file from: {file_url}")
            response = requests.get(file_url, timeout=30)
            response.raise_for_status()
            file_content = response.content

            # Get filename from URL
            filename = file_url.split('/')[-1].split('?')[0]

            return self.process_document_from_bytes(file_content, filename)

        except requests.RequestException as e:
            return {
                'error': f'Failed to download file: {e}',
                'success': False
            }
        except Exception as e:
            print(f"Error processing document from file: {e}")
            import traceback
            traceback.print_exc()
            return {
                'error': str(e),
                'success': False
            }

    def process_document(self, file_url: str) -> Dict:
        """
        Process document from URL

        Args:
            file_url: URL to the document file

        Returns:
            Dict with extracted data
        """
        try:
            # Ensure HTTPS
            if file_url.startswith('http://'):
                file_url = file_url.replace('http://', 'https://', 1)

            # Download file
            print(f"Downloading file from: {file_url}")
            response = requests.get(file_url, timeout=30)
            response.raise_for_status()

            # Get filename from URL
            filename = file_url.split('/')[-1].split('?')[0]

            return self.process_document_from_bytes(response.content, filename)

        except requests.RequestException as e:
            return {
                'error': f'Failed to download file: {e}',
                'success': False
            }
        except Exception as e:
            print(f"Error processing document: {e}")
            import traceback
            traceback.print_exc()
            return {
                'error': str(e),
                'success': False
            }

    def get_available_providers(self) -> List[str]:
        """Get list of available provider names"""
        return [p.name for p in self.providers]


# Singleton instance
_processor = None

def get_document_processor() -> DocumentProcessor:
    """Get or create document processor instance"""
    global _processor
    if _processor is None:
        _processor = DocumentProcessor()
    return _processor


def process_invoice(file_url: str) -> Dict:
    """
    Convenience function to process an invoice

    Args:
        file_url: URL to the invoice file

    Returns:
        Dict with extracted data
    """
    processor = get_document_processor()
    return processor.process_document(file_url)
