import os
from typing import Dict, Any, Optional
from google import genai
from google.genai import types
from backend.app.core.config import settings

class GeminiClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        self.client = None
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"Failed to initialize Gemini Client: {e}")

    def is_configured(self) -> bool:
        return bool(self.client)

    def _candidate_models(self) -> list[str]:
        models = [settings.GEMINI_MODEL, "gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash"]
        unique_models: list[str] = []
        for m in models:
            if m and m not in unique_models:
                unique_models.append(m)
        return unique_models

    async def chat(self, prompt: str, business_context: str) -> Dict[str, Any]:
        """Interacts with Google Gemini using grounded business context."""
        if not self.is_configured():
            return {
                "reply": "The Google Gemini AI service is currently not configured. Please provide your GEMINI_API_KEY in Settings or your environment variables to enable autonomous intelligence.",
                "proposed_action": None,
            }

        system_instruction = f"""
You are the PayPilot Autonomous Financial AI Pilot for a freelancer or small agency.
You have direct, real-time access to their authorized business records.

CURRENT REAL BUSINESS DATA:
{business_context}

RULES:
1. Ground every answer strictly in the real business data provided above.
2. Never invent clients, revenue figures, or invoices.
3. If an answer cannot be determined from the data, explicitly state that no record exists.
4. If the user asks to perform an action (e.g., create an invoice, send a reminder), answer with a clear explanation and propose a structured action for the user to confirm.
5. Keep your tone concise, professional, and helpful.
"""

        last_error = None
        response = None
        for model_name in self._candidate_models():
            try:
                response = await self.client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.2,
                    ),
                )
                if response:
                    break
            except Exception as e:
                last_error = e

        if not response:
            clean_err = str(last_error) if last_error else "Could not generate content from Gemini API."
            # Sanitize error to avoid leaking any credentials
            if self.api_key and self.api_key in clean_err:
                clean_err = clean_err.replace(self.api_key, "[REDACTED]")
            return {
                "reply": f"Gemini API request failed: {clean_err}",
                "proposed_action": None,
            }

        reply_text = response.text or "I could not generate a response."
        
        # Detect if user is asking to create an invoice or send reminders
        proposed_action = None
        prompt_lower = prompt.lower()
        if "reminder" in prompt_lower and ("send" in prompt_lower or "prepare" in prompt_lower or "remind" in prompt_lower):
            proposed_action = {
                "action_type": "TRIGGER_REMINDERS",
                "title": "Dispatch Overdue Reminders",
                "description": "Scan all accounts receivable and send scheduled email reminder notifications for overdue invoices.",
                "payload": {},
            }

        return {
            "reply": reply_text,
            "proposed_action": proposed_action,
        }

    async def generate_structured_insights(self, prompt: str, system_instruction: str) -> Optional[str]:
        """Calls Gemini with JSON mime-type to generate structured financial intelligence recommendations."""
        if not self.is_configured():
            return None

        for model_name in self._candidate_models():
            try:
                response = await self.client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.2,
                        response_mime_type="application/json",
                    ),
                )
                if response and response.text:
                    return response.text
            except Exception as e:
                continue
        return None


