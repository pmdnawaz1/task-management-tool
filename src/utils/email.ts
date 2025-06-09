interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: EmailOptions) {
  console.log('Attempting to send email to:', to);
  console.log('Subject:', subject);

  try {
    // Get the base URL based on the environment
    const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    const response = await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null) as { error?: string } | null;
      console.error('Email API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    const result = await response.json() as { success: boolean; messageId: string };
    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error in sendEmail utility:', error);
    throw error;
  }
} 