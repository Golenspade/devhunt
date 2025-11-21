import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, token, timezone, window } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // 创建一个 ReadableStream 来流式传输日志
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const projectRoot = join(process.cwd(), '..');
        
        // 发送初始日志
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log: 'Initializing DevHunt engine...' })}\n\n`));

        // 第一步：运行 scan 命令
        const scanArgs = ['devhunt', 'scan', username];
        if (token) {
          scanArgs.push('--token', token);
        }
        if (window) {
          scanArgs.push('--window', window);
        }
        scanArgs.push('--yes'); // 跳过确认

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log: `Scanning GitHub user: ${username}...` })}\n\n`));

        const scanProcess = spawn('bun', scanArgs, {
          cwd: projectRoot,
          env: { ...process.env, GITHUB_TOKEN: token || process.env.GITHUB_TOKEN },
        });

        let scanOutput = '';
        scanProcess.stdout.on('data', (data) => {
          const output = data.toString();
          scanOutput += output;
          // 发送实时日志
          const lines = output.split('\n').filter((line: string) => line.trim());
          lines.forEach((line: string) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log: line })}\n\n`));
          });
        });

        scanProcess.stderr.on('data', (data) => {
          const error = data.toString();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log: `Error: ${error}` })}\n\n`));
        });

        await new Promise((resolve, reject) => {
          scanProcess.on('close', (code) => {
            if (code === 0) {
              resolve(null);
            } else {
              reject(new Error(`Scan process exited with code ${code}`));
            }
          });
        });

        // 第二步：运行 report 命令
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log: 'Generating profile report...' })}\n\n`));

        const reportArgs = ['devhunt', 'report', username];
        if (timezone) {
          reportArgs.push('--tz', timezone);
        }

        const reportProcess = spawn('bun', reportArgs, {
          cwd: projectRoot,
        });

        reportProcess.stdout.on('data', (data) => {
          const output = data.toString();
          const lines = output.split('\n').filter((line: string) => line.trim());
          lines.forEach((line: string) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log: line })}\n\n`));
          });
        });

        reportProcess.stderr.on('data', (data) => {
          const error = data.toString();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log: `Error: ${error}` })}\n\n`));
        });

        await new Promise((resolve, reject) => {
          reportProcess.on('close', (code) => {
            if (code === 0) {
              resolve(null);
            } else {
              reject(new Error(`Report process exited with code ${code}`));
            }
          });
        });

        // 完成
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log: 'DONE. Profile generated successfully!', done: true })}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in analyze API:', error);
    return NextResponse.json(
      { error: 'Failed to analyze profile' },
      { status: 500 }
    );
  }
}

