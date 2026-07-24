import Groq from 'groq-sdk';

const VISION_MODEL = 'qwen/qwen3.6-27b';
const TEXT_MODEL = 'llama-3.3-70b-versatile';

/**
 * Analyze a screenshot using Groq's Qwen Vision model.
 * Sends the image as base64 and returns a structured bug report.
 */
export async function analyzeScreenshot(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  additionalNotes: string
): Promise<string> {
  const groq = new Groq({ apiKey });

  const systemPrompt = `You are an expert QA engineer with 15 years of experience in software testing. 
You are analyzing a screenshot of a bug/defect found during testing.

Your task is to generate a structured, professional bug report from the screenshot. 
Include the following sections:

**Bug Title**: A concise, descriptive title for the bug.

**Environment**: Identify the application, browser, or platform if visible.

**Pre-conditions**: What state the system must be in before the bug can be reproduced (e.g., logged in, specific page).

**Test Data**: Any specific data inputs visible that are relevant to the bug.

**Steps to Reproduce**: List the likely steps that led to this bug (based on what you see).

**Expected Behavior**: What should have happened.

**Actual Behavior**: What actually happened (describe the bug visible in the screenshot).

**Severity**: Classify as Critical / Major / Minor / Trivial (Technical impact).

**Priority**: Classify as High / Medium / Low (Business urgency).

**Additional Observations**: Any other relevant details you notice in the screenshot.

Be precise, professional, and thorough. Format the output in clean markdown.`;

  const userContent: Groq.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${imageBase64}`,
      },
    },
    {
      type: 'text',
      text: additionalNotes
        ? `Analyze this screenshot for bugs. Additional context from the tester: "${additionalNotes}"`
        : 'Analyze this screenshot and generate a detailed bug report.',
    },
  ];

  const completion = await groq.chat.completions.create({
    model: VISION_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.3,
    max_tokens: 2048,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response received from Groq model');
  }

  // Remove <think>...</think> chain-of-thought blocks if the model outputs them
  const cleanedContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  return cleanedContent;
}

/**
 * Test Groq API connection with a simple text completion.
 */
export async function testGroqConnection(apiKey: string): Promise<boolean> {
  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: TEXT_MODEL,
    messages: [{ role: 'user', content: 'Say "Connection successful" in exactly those two words.' }],
    max_tokens: 20,
  });

  return !!completion.choices[0]?.message?.content;
}
