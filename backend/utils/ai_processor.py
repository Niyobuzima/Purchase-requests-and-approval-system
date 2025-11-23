"""
AI Document Processor for Invoice/Receipt Extraction
Uses OpenAI Responses API with GPT-5 and file_search tool
"""

import os
import json
import requests
import time
from io import BytesIO
from typing import Dict, Optional
from decimal import Decimal

try:
    from openai import OpenAI
    OPENAI_SUPPORT = True
except ImportError:
    OPENAI_SUPPORT = False
    print("Warning: openai library not installed. AI extraction disabled.")


class DocumentProcessor:
    """Process invoices and receipts using OpenAI Responses API with GPT-5 and file_search"""

    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key and OPENAI_SUPPORT:
            print("Warning: OPENAI_API_KEY not set in environment")

        if OPENAI_SUPPORT and self.api_key:
            self.client = OpenAI(api_key=self.api_key)
        else:
            self.client = None

    def process_document_from_bytes(self, file_content: bytes, filename: str) -> Dict:
        """
        Process document from raw bytes (uploaded file content)

        Args:
            file_content: Raw file bytes
            filename: Original filename

        Returns:
            Dict with extracted data
        """
        try:
            if not self.client:
                return {
                    'error': 'OpenAI client not initialized',
                    'success': False
                }

            # Get file extension from filename
            file_extension = self._get_file_extension(filename)
            openai_filename = f"invoice{file_extension}"

            # Upload file to OpenAI for file_search
            print("Uploading file to OpenAI...")
            file_object = self.client.files.create(
                file=(openai_filename, BytesIO(file_content)),
                purpose='assistants'  # file_search requires 'assistants' purpose
            )

            # Continue with the rest of the processing...
            return self._process_with_vector_store(file_object, openai_filename)

        except Exception as e:
            print(f"Error processing document from bytes: {e}")
            import traceback
            traceback.print_exc()
            return {
                'error': str(e),
                'success': False
            }

    def process_document_from_file(self, cloudinary_file) -> Dict:
        """
        Process document from Cloudinary file object (bypassing URL download)

        Args:
            cloudinary_file: CloudinaryField instance

        Returns:
            Dict with extracted data
        """
        try:
            if not self.client:
                return {
                    'error': 'OpenAI client not initialized',
                    'success': False
                }
            
            public_id = cloudinary_file.public_id if hasattr(cloudinary_file, 'public_id') else None

            if not public_id:
                # Fallback: try to extract from URL
                file_url = cloudinary_file.url
                parts = file_url.split('/')
                if len(parts) > 0:
                    # Get the filename with extension
                    filename_with_ext = parts[-1].split('?')[0]  # Remove query params
                    # Get everything after 'upload/'
                    upload_index = parts.index('upload') if 'upload' in parts else -1
                    if upload_index >= 0 and upload_index < len(parts) - 1:
                        # Reconstruct public_id from parts after 'upload'
                        public_id_parts = parts[upload_index + 1:]
                        public_id = '/'.join(public_id_parts).split('?')[0]  # Remove extension
                        # Remove file extension from last part
                        if '.' in public_id:
                            public_id = public_id.rsplit('.', 1)[0]

            file_url = cloudinary_file.url

            # Ensure HTTPS
            if file_url.startswith('http://'):
                file_url = file_url.replace('http://', 'https://', 1)

            # Try downloading with authentication headers
            response = requests.get(file_url, timeout=30)
            response.raise_for_status()
            file_content = response.content

            # Get file extension from URL
            file_extension = self._get_file_extension(file_url)
            filename = f"invoice{file_extension}"

            # Upload file to OpenAI for file_search
            print("Uploading file to OpenAI...")
            file_object = self.client.files.create(
                file=(filename, BytesIO(file_content)),
                purpose='assistants'  # file_search requires 'assistants' purpose
            )

            # Continue with the rest of the processing...
            return self._process_with_vector_store(file_object, filename)

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
        Main entry point for document processing using Responses API with file_search

        Args:
            file_url: URL to the document file (from Cloudinary)

        Returns:
            Dict with extracted data: {
                'vendor_name': str,
                'items': list,
                'total_amount': decimal,
                'invoice_number': str,
                'date': str,
                'success': bool
            }
        """
        try:
            if not self.client:
                return {
                    'error': 'OpenAI client not initialized',
                    'success': False
                }
            response = requests.get(file_url, timeout=30)
            response.raise_for_status()

            # Get file extension from URL
            file_extension = self._get_file_extension(file_url)
            filename = f"invoice{file_extension}"
            file_object = self.client.files.create(
                file=(filename, BytesIO(response.content)),
                purpose='assistants'
            )

            # Process with vector store
            return self._process_with_vector_store(file_object, filename)

        except Exception as e:
            print(f"Error processing document: {e}")
            import traceback
            traceback.print_exc()
            return {
                'error': str(e),
                'success': False
            }

    def _process_with_vector_store(self, file_object, filename: str) -> Dict:
        """
        Process a file using OpenAI Responses API (GPT-5) with file attachments

        Args:
            file_object: OpenAI file object
            filename: Name of the file

        Returns:
            Dict with extracted data
        """
        try:
            model = os.getenv('OPENAI_MODEL', 'gpt-5')

            prompt = """Extract the following information from the uploaded invoice/receipt document and return ONLY a valid JSON object.

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

            # Determine file type from filename
            file_extension = filename.lower().split('.')[-1] if '.' in filename else ''
            image_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
            is_image = file_extension in image_extensions

            print(f"File type detected: {'image' if is_image else 'document'} (.{file_extension})")

            try:
                # Build content array based on file type
                content = [
                    {
                        "type": "input_text",
                        "text": prompt
                    }
                ]

                # Use input_image for images, input_file for PDFs and documents
                if is_image:
                    content.append({
                        "type": "input_image",
                        "file_id": file_object.id
                    })
                else:
                    content.append({
                        "type": "input_file",
                        "file_id": file_object.id
                    })

                response = self.client.responses.create(
                    model=model,
                    input=[{
                        "type": "message",
                        "role": "user",
                        "content": content
                    }],
                    text={"format": {"type": "json_object"}},
                )

                # Extract the response text
                result = response.output_text

            except Exception as responses_error:
                print(f"Responses API error: {responses_error}")
                print("Attempting alternative approach...")

                # Alternative: Try using chat.completions with vision if it's an image
                # Or fall back to a simpler approach
                return {
                    'error': f'Responses API failed: {str(responses_error)}',
                    'success': False
                }

            # Cleanup file
            print("Cleaning up resources...")
            try:
                self.client.files.delete(file_object.id)
            except Exception as cleanup_error:
                print(f"Cleanup warning: {cleanup_error}")

            # Parse JSON response
            extracted_data = self._parse_response(result)

            if extracted_data:
                extracted_data['success'] = True
                return extracted_data
            else:
                return {
                    'error': 'Failed to parse GPT response',
                    'success': False,
                    'raw_response': result[:500]
                }

        except Exception as e:
            print(f"Error processing document: {e}")
            import traceback
            traceback.print_exc()
            return {
                'error': str(e),
                'success': False
            }

    def _get_file_extension(self, url: str) -> str:
        """Extract file extension from URL"""
        url_without_params = url.split('?')[0]
        if '.' in url_without_params:
            ext = url_without_params.rsplit('.', 1)[1].lower()
            return f'.{ext}'
        return '.pdf'

    def _parse_response(self, response_text: str) -> Optional[Dict]:
        """Parse the JSON response from GPT"""
        try:
            cleaned_text = response_text.strip()

            # Remove markdown code blocks if present
            if cleaned_text.startswith('```json'):
                cleaned_text = cleaned_text[7:]
            elif cleaned_text.startswith('```'):
                cleaned_text = cleaned_text[3:]

            if cleaned_text.endswith('```'):
                cleaned_text = cleaned_text[:-3]

            cleaned_text = cleaned_text.strip()

            # Parse JSON
            extracted_data = json.loads(cleaned_text)

            # Validate and ensure all required fields
            if 'items' not in extracted_data or not isinstance(extracted_data['items'], list):
                extracted_data['items'] = []

            if 'vendor_name' not in extracted_data:
                extracted_data['vendor_name'] = None
            if 'total_amount' not in extracted_data:
                extracted_data['total_amount'] = None
            if 'invoice_number' not in extracted_data:
                extracted_data['invoice_number'] = None
            if 'date' not in extracted_data:
                extracted_data['date'] = None

            return extracted_data

        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            print(f"Raw response: {response_text}")
            return None
        except Exception as e:
            print(f"Parse error: {e}")
            return None


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
