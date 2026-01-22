import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // Читаем HTML файл из public
    // process.cwd() указывает на корень проекта (где package.json)
    // В нашем случае это папка app
    const filePath = join(process.cwd(), 'public', 'presentation', 'index.html');
    const html = readFileSync(filePath, 'utf-8');
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('Error reading presentation file:', error);
    // Fallback: попробуем альтернативный путь
    try {
      const altPath = join(process.cwd(), 'app', 'public', 'presentation', 'index.html');
      const html = readFileSync(altPath, 'utf-8');
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    } catch (altError) {
      return new NextResponse('Presentation not found', { status: 404 });
    }
  }
}

