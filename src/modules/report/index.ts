import type { ReportSection, ModuleOptions } from '../../shared/types.js';
import todoTracker from '../todo-tracker/index.js';
import depAudit from '../dep-audit/index.js';
import gitStats from '../git-stats/index.js';
import codeHealth from '../code-health/index.js';

const modules = [todoTracker, depAudit, gitStats, codeHealth];

export interface ReportOptions {
  /** Target directory to analyze */
  targetPath: string;
  /** Show verbose output */
  verbose: boolean;
}

export interface ReportResult {
  markdown: string;
  sections: ReportSection[];
  generatedAt: string;
}

export async function generateReport(options: ReportOptions): Promise<ReportResult> {
  const moduleOptions: ModuleOptions = {
    targetPath: options.targetPath,
    json: false,
    verbose: options.verbose,
  };

  const sections: ReportSection[] = [];

  for (const mod of modules) {
    try {
      const section = await mod.toReportSection(moduleOptions);
      sections.push(section);
    } catch (err) {
      sections.push({
        title: mod.name,
        summary: `Error: ${err instanceof Error ? err.message : String(err)}`,
        items: [],
      });
    }
  }

  const generatedAt = new Date().toISOString();
  const markdown = renderMarkdown(sections, generatedAt);

  return { markdown, sections, generatedAt };
}

function renderMarkdown(sections: ReportSection[], generatedAt: string): string {
  const lines: string[] = [];

  lines.push('# DevKit Report');
  lines.push('');
  lines.push(`Generated: ${generatedAt}`);
  lines.push('');

  let totalItems = 0;

  for (const section of sections) {
    lines.push(`## ${section.title}`);
    lines.push('');
    lines.push(section.summary);
    lines.push('');

    if (section.items.length > 0) {
      for (const item of section.items) {
        const severity = item.severity ? ` [${item.severity}]` : '';
        lines.push(`- **${item.label}**${severity}: ${item.value}`);
      }
      lines.push('');
    }

    totalItems += section.items.length;
  }

  lines.push('---');
  lines.push(`**Total sections:** ${sections.length} | **Total items:** ${totalItems}`);
  lines.push('');

  return lines.join('\n');
}
