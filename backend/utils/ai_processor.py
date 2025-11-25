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

from core.logging_utils import app_logger

# OpenAI support
try:
    from openai import OpenAI
    OPENAI_SUPPORT = True
except ImportError:
    OPENAI_SUPPORT = False
    app_logger.warning("openai library not installed")

# Google Gemini support
try:
    import google.generativeai as genai
    GEMINI_SUPPORT = True
except ImportError:
    GEMINI_SUPPORT = False
    app_logger.warning("google-generativeai library not installed")


IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'}

MIME_TYPE_MAP = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
}

EXTRACTION_PROMPT = """Extract the following information from this invoice/receipt document and return ONLY a valid JSON object.

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

Analyze the document carefully and extract all invoice information."""


def get_file_extension(filename: str) -> str:
    """Extract file extension from filename"""
    if '.' in filename:
        return '.' + filename.rsplit('.', 1)[1].lower()
    return '.pdf'


def get_mime_type(extension: str) -> str:
    """Get MIME type from file extension"""
    return MIME_TYPE_MAP.get(extension.lower(), 'application/pdf')


def is_image_file(extension: str) -> bool:
    """Check if file extension is an image type"""
    return extension.lstrip('.').lower() in IMAGE_EXTENSIONS


def parse_json_response(response_text: str, provider_name: str) -> Optional[Dict]:
    """
    Parse JSON response from AI provider, handling markdown code blocks.

    Args:
        response_text: Raw response text from AI
        provider_name: Name of provider for logging

    Returns:
        Parsed dict or None if parsing fails
    """
    try:
        cleaned = response_text.strip()

        # Remove markdown code block markers
        if cleaned.startswith('```json'):
            cleaned = cleaned[7:]
        elif cleaned.startswith('```'):
            cleaned = cleaned[3:]
        if cleaned.endswith('```'):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        data = json.loads(cleaned)

        # Ensure required fields have defaults
        data.setdefault('items', [])
        data.setdefault('vendor_name', None)
        data.setdefault('total_amount', None)
        data.setdefault('invoice_number', None)
        data.setdefault('date', None)

        return data
    except Exception as e:
        app_logger.error(f"[{provider_name}] Parse error: {e}")
        return None


def is_quota_error(error: Exception) -> bool:
    """Check if error is a quota/rate limit error"""
    error_str = str(error).lower()
    return 'quota' in error_str or 'rate' in error_str or '429' in error_str


def build_error_response(error: Exception, provider_name: str, retry_fallback: bool = True) -> Dict:
    """Build standardized error response"""
    if is_quota_error(error):
        app_logger.warning(f"[{provider_name}] Quota/Rate limit error: {error}")
        return {
            'error': f'quota_exceeded: {error}',
            'success': False,
            'retry_with_fallback': retry_fallback
        }

    app_logger.error(f"[{provider_name}] Error: {error}", exc_info=True)
    return {
        'error': str(error),
        'success': False,
        'retry_with_fallback': retry_fallback
    }


def build_success_response(data: Dict, provider_name: str) -> Dict:
    """Build standardized success response"""
    data['success'] = True
    data['provider'] = provider_name
    return data


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
                app_logger.warning("OpenAI: Library not installed")
            elif not self.api_key:
                app_logger.info("OpenAI: API key not configured")

    def process_document(self, file_content: bytes, filename: str) -> Dict:
        """Process document using OpenAI Responses API"""
        if not self.is_available:
            return {'error': 'OpenAI not available', 'success': False}

        try:
            file_extension = get_file_extension(filename)
            openai_filename = f"invoice{file_extension}"

            # Upload file to OpenAI
            app_logger.debug(f"[OpenAI] Uploading file: {openai_filename}")
            file_object = self.client.files.create(
                file=(openai_filename, BytesIO(file_content)),
                purpose='assistants'
            )

            try:
                # Build content array based on file type
                is_image = is_image_file(file_extension)
                app_logger.debug(f"[OpenAI] File type: {'image' if is_image else 'document'}")

                content = [{"type": "input_text", "text": EXTRACTION_PROMPT}]
                if is_image:
                    content.append({"type": "input_image", "file_id": file_object.id})
                else:
                    content.append({"type": "input_file", "file_id": file_object.id})

                # Call Responses API
                app_logger.debug(f"[OpenAI] Calling model: {self.model}")
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
            finally:
                # Always cleanup uploaded file
                try:
                    self.client.files.delete(file_object.id)
                except Exception as e:
                    app_logger.warning(f"[OpenAI] Cleanup warning: {e}")

            # Parse and return response
            extracted_data = parse_json_response(result, self.name)
            if extracted_data:
                return build_success_response(extracted_data, self.name)

            return {'error': 'Failed to parse response', 'success': False}

        except Exception as e:
            return build_error_response(e, self.name, retry_fallback=True)


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
                app_logger.warning("Gemini: Library not installed")
            elif not self.api_key:
                app_logger.info("Gemini: API key not configured")

    def process_document(self, file_content: bytes, filename: str) -> Dict:
        """Process document using Google Gemini with file upload"""
        if not self.is_available:
            return {'error': 'Gemini not available', 'success': False}

        try:
            file_extension = get_file_extension(filename)
            mime_type = get_mime_type(file_extension)

            app_logger.debug(f"[Gemini] Processing file: {filename} ({mime_type})")
            app_logger.debug(f"[Gemini] Using model: {self.model}")

            # Upload file to Gemini
            app_logger.debug("[Gemini] Uploading file...")
            uploaded_file = genai.upload_file(
                BytesIO(file_content),
                mime_type=mime_type,
                display_name=filename
            )

            try:
                # Wait for file to be processed
                app_logger.debug("[Gemini] Waiting for file processing...")
                while uploaded_file.state.name == "PROCESSING":
                    time.sleep(1)
                    uploaded_file = genai.get_file(uploaded_file.name)

                if uploaded_file.state.name == "FAILED":
                    return {'error': 'Gemini file processing failed', 'success': False}

                app_logger.debug(f"[Gemini] File ready: {uploaded_file.uri}")

                # Generate content
                model = genai.GenerativeModel(self.model)
                app_logger.debug("[Gemini] Generating response...")
                response = model.generate_content(
                    [uploaded_file, EXTRACTION_PROMPT],
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json"
                    )
                )

                result = response.text
            finally:
                # Always cleanup uploaded file
                try:
                    genai.delete_file(uploaded_file.name)
                    app_logger.debug("[Gemini] File cleaned up")
                except Exception as e:
                    app_logger.warning(f"[Gemini] Cleanup warning: {e}")

            # Parse and return response
            extracted_data = parse_json_response(result, self.name)
            if extracted_data:
                return build_success_response(extracted_data, self.name)

            return {'error': 'Failed to parse Gemini response', 'success': False}

        except Exception as e:
            return build_error_response(e, self.name, retry_fallback=False)


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
                    app_logger.info(f"AI Provider initialized: {provider_name}")

        if not self.providers:
            app_logger.warning("No AI providers available!")

    def _download_file(self, file_url: str) -> tuple[bytes, str]:
        """
        Download file from URL and return content with filename.

        Args:
            file_url: URL to download from

        Returns:
            Tuple of (file_content, filename)

        Raises:
            requests.RequestException: If download fails
        """
        # Ensure HTTPS
        if file_url.startswith('http://'):
            file_url = file_url.replace('http://', 'https://', 1)

        app_logger.debug(f"Downloading file from: {file_url}")
        response = requests.get(file_url, timeout=30)
        response.raise_for_status()

        # Extract filename from URL
        filename = file_url.split('/')[-1].split('?')[0]

        return response.content, filename

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
            app_logger.info(f"Trying AI provider: {provider.name}")

            result = provider.process_document(file_content, filename)

            if result.get('success'):
                app_logger.info(f"Success with {provider.name}")
                return result

            error = result.get('error', 'Unknown error')
            errors.append(f"{provider.name}: {error}")
            app_logger.warning(f"Failed with {provider.name}: {error}")

            # Check if we should try fallback
            if not result.get('retry_with_fallback', True):
                app_logger.info(f"Provider {provider.name} indicated no fallback needed")
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
            file_content, filename = self._download_file(cloudinary_file.url)
            return self.process_document_from_bytes(file_content, filename)

        except requests.RequestException as e:
            return {
                'error': f'Failed to download file: {e}',
                'success': False
            }
        except Exception as e:
            app_logger.error(f"Error processing document from file: {e}", exc_info=True)
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
            file_content, filename = self._download_file(file_url)
            return self.process_document_from_bytes(file_content, filename)

        except requests.RequestException as e:
            return {
                'error': f'Failed to download file: {e}',
                'success': False
            }
        except Exception as e:
            app_logger.error(f"Error processing document: {e}", exc_info=True)
            return {
                'error': str(e),
                'success': False
            }

    def get_available_providers(self) -> List[str]:
        """Get list of available provider names"""
        return [p.name for p in self.providers]

_processor = None

def get_document_processor() -> DocumentProcessor:
    """Get or create document processor singleton instance"""
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
