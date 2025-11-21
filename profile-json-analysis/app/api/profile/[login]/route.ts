import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ login: string }> }
) {
  try {
    const { login } = await params;

    // 读取 profile.json 和 top_repos.json
    const baseDir = join(process.cwd(), '..', 'out', login);
    const profilePath = join(baseDir, 'profile.json');
    const topReposPath = join(baseDir, 'top_repos.json');
    const rawPrsPath = join(baseDir, 'raw', 'prs.jsonl');

    const [profileData, topReposData] = await Promise.all([
      readFile(profilePath, 'utf-8').then(JSON.parse),
      readFile(topReposPath, 'utf-8').then(JSON.parse),
    ]);

    // 从 prs.jsonl 生成 hours histogram
    let hoursHistogram: number[] = new Array(24).fill(0);
    try {
      const prsContent = await readFile(rawPrsPath, 'utf-8');
      const prs = prsContent
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      // 计算每小时的 PR 数量
      prs.forEach((pr: any) => {
        if (pr.createdAt) {
          const date = new Date(pr.createdAt);
          const hour = date.getUTCHours(); // 使用 UTC 时间，或根据 timezone 调整
          hoursHistogram[hour]++;
        }
      });
    } catch (err) {
      console.warn('Failed to load PR hours data:', err);
    }

    return NextResponse.json({
      profile: profileData,
      topRepos: topReposData,
      hoursHistogram,
    });
  } catch (error) {
    console.error('Error loading profile data:', error);
    return NextResponse.json(
      { error: 'Failed to load profile data' },
      { status: 500 }
    );
  }
}

