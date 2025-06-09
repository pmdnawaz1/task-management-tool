import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '~/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '~/server/auth';
import formidable, { type Fields, type Files } from 'formidable';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }


  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });
    
    const [, files]: [Fields, Files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileBuffer = fs.readFileSync(file.filepath);
    const fileName = `${uuidv4()}-${file.originalFilename ?? 'unnamed'}`;
    
    // Use admin client for storage operations but associate with user
    const { error } = await supabaseAdmin.storage
      .from('attachments')
      .upload(`${session.user.id}/${fileName}`, fileBuffer, {
        contentType: file.mimetype ?? 'application/octet-stream',
        upsert: false
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('attachments')
      .getPublicUrl(`${session.user.id}/${fileName}`);

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      fileName: file.originalFilename ?? 'unnamed',
      url: urlData.publicUrl, // Also include 'url' for profile uploads
      fileUrl: urlData.publicUrl,
      fileSize: file.size ?? 0,
      mimeType: file.mimetype ?? 'application/octet-stream',
    });
  } catch {
    return res.status(500).json({ error: 'Upload failed' });
  }
}
