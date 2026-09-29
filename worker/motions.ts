/**
 * MOTIONS HANDLER (BANK MOSI + MOTION KNOWLEDGE)
 *
 * Fungsi:
 * - Menyediakan daftar mosi dari database D1.
 * - Menyediakan knowledge base lengkap setiap mosi untuk kebutuhan AI.
 *
 * Endpoint:
 * - GET /api/motions — publik, tidak perlu login.
 */

import type { Env } from './lib/db';
import { json, queryAll } from './lib/db';

type MotionRow = {
  id: number;
  text: string;
  sdg_number: number | null;
  created_at: string;
};

type MotionSdgRow = {
  motion_id: number;
  number: number;
  title: string;
  description: string | null;
  is_primary: number;
};

type MotionContextRow = {
  motion_id: number;
  background: string | null;
  focus_issue: string | null;
  sdg_context: string | null;
  key_considerations: string | null;
  analysis_framework: string | null;
};

type MotionQuestionRow = {
  id: number;
  motion_id: number;
  category: string;
  question: string;
  position: number;
};

type MotionArgumentRow = {
  id: number;
  motion_id: number;
  side: 'PRO' | 'KONTRA';
  title: string;
  explanation: string | null;
  reasoning: string | null;
  evidence_to_find: string | null;
  position: number;
};

type MotionRebuttalRow = {
  id: number;
  motion_id: number;
  argument_id: number | null;
  side: 'PRO' | 'KONTRA';
  counterargument: string;
  rebuttal: string;
  position: number;
};

type MotionSourceRow = {
  id: number;
  motion_id: number;
  organization: string | null;
  title: string | null;
  url: string | null;
  description: string | null;
  position: number;
};

type MotionKeywordRow = {
  id: number;
  motion_id: number;
  language: 'id' | 'en';
  keyword: string;
  position: number;
};

export async function handleListMotions(env: Env): Promise<Response> {
  try {
    const [
      motions,
      sdgs,
      contexts,
      questions,
      argumentsRows,
      rebuttals,
      sources,
      keywords,
    ] = await Promise.all([
      queryAll<MotionRow>(
        env.DB,
        `
          SELECT
            id,
            text,
            sdg_number,
            created_at
          FROM motions
          ORDER BY
            sdg_number IS NULL,
            sdg_number ASC,
            id ASC
        `,
      ),

      queryAll<MotionSdgRow>(
        env.DB,
        `
          SELECT
            ms.motion_id,
            s.number,
            s.title,
            s.description,
            ms.is_primary
          FROM motion_sdgs ms
          INNER JOIN sdgs s
            ON s.id = ms.sdg_id
          ORDER BY
            ms.motion_id ASC,
            ms.is_primary DESC,
            s.number ASC
        `,
      ),

      queryAll<MotionContextRow>(
        env.DB,
        `
          SELECT
            motion_id,
            background,
            focus_issue,
            sdg_context,
            key_considerations,
            analysis_framework
          FROM motion_context
        `,
      ),

      queryAll<MotionQuestionRow>(
        env.DB,
        `
          SELECT
            id,
            motion_id,
            category,
            question,
            position
          FROM motion_questions
          ORDER BY
            motion_id ASC,
            position ASC,
            id ASC
        `,
      ),

      queryAll<MotionArgumentRow>(
        env.DB,
        `
          SELECT
            id,
            motion_id,
            side,
            title,
            explanation,
            reasoning,
            evidence_to_find,
            position
          FROM motion_arguments
          ORDER BY
            motion_id ASC,
            side ASC,
            position ASC,
            id ASC
        `,
      ),

      queryAll<MotionRebuttalRow>(
        env.DB,
        `
          SELECT
            id,
            motion_id,
            argument_id,
            side,
            counterargument,
            rebuttal,
            position
          FROM motion_rebuttals
          ORDER BY
            motion_id ASC,
            position ASC,
            id ASC
        `,
      ),

      queryAll<MotionSourceRow>(
        env.DB,
        `
          SELECT
            id,
            motion_id,
            organization,
            title,
            url,
            description,
            position
          FROM motion_sources
          ORDER BY
            motion_id ASC,
            position ASC,
            id ASC
        `,
      ),

      queryAll<MotionKeywordRow>(
        env.DB,
        `
          SELECT
            id,
            motion_id,
            language,
            keyword,
            position
          FROM motion_keywords
          ORDER BY
            motion_id ASC,
            language ASC,
            position ASC,
            id ASC
        `,
      ),
    ]);

    const contextByMotion = new Map<number, MotionContextRow>();
    for (const row of contexts) {
      contextByMotion.set(row.motion_id, row);
    }

    const sdgsByMotion = new Map<number, MotionSdgRow[]>();
    for (const row of sdgs) {
      const list = sdgsByMotion.get(row.motion_id) ?? [];
      list.push(row);
      sdgsByMotion.set(row.motion_id, list);
    }

    const questionsByMotion = new Map<number, MotionQuestionRow[]>();
    for (const row of questions) {
      const list = questionsByMotion.get(row.motion_id) ?? [];
      list.push(row);
      questionsByMotion.set(row.motion_id, list);
    }

    const argumentsByMotion = new Map<number, MotionArgumentRow[]>();
    for (const row of argumentsRows) {
      const list = argumentsByMotion.get(row.motion_id) ?? [];
      list.push(row);
      argumentsByMotion.set(row.motion_id, list);
    }

    const rebuttalsByMotion = new Map<number, MotionRebuttalRow[]>();
    for (const row of rebuttals) {
      const list = rebuttalsByMotion.get(row.motion_id) ?? [];
      list.push(row);
      rebuttalsByMotion.set(row.motion_id, list);
    }

    const sourcesByMotion = new Map<number, MotionSourceRow[]>();
    for (const row of sources) {
      const list = sourcesByMotion.get(row.motion_id) ?? [];
      list.push(row);
      sourcesByMotion.set(row.motion_id, list);
    }

    const keywordsByMotion = new Map<number, MotionKeywordRow[]>();
    for (const row of keywords) {
      const list = keywordsByMotion.get(row.motion_id) ?? [];
      list.push(row);
      keywordsByMotion.set(row.motion_id, list);
    }

    return json({
      motions: motions.map((motion) => {
        const context = contextByMotion.get(motion.id);
        const motionSdgs = sdgsByMotion.get(motion.id) ?? [];

        return {
          id: motion.id,
          text: motion.text,
          sdgNumber: motion.sdg_number,
          createdAt: motion.created_at,

          sdgs: motionSdgs.map((sdg) => ({
            number: sdg.number,
            title: sdg.title,
            description: sdg.description,
            isPrimary: Boolean(sdg.is_primary),
          })),

          context: context
            ? {
                background: context.background,
                focusIssue: context.focus_issue,
                sdgContext: context.sdg_context,
                keyConsiderations: context.key_considerations,
                analysisFramework: context.analysis_framework,
              }
            : null,

          questions: (questionsByMotion.get(motion.id) ?? []).map((question) => ({
            id: question.id,
            category: question.category,
            question: question.question,
            position: question.position,
          })),

          arguments: (argumentsByMotion.get(motion.id) ?? []).map((argument) => ({
            id: argument.id,
            side: argument.side,
            title: argument.title,
            explanation: argument.explanation,
            reasoning: argument.reasoning,
            evidenceToFind: argument.evidence_to_find,
            position: argument.position,
          })),

          rebuttals: (rebuttalsByMotion.get(motion.id) ?? []).map((rebuttal) => ({
            id: rebuttal.id,
            argumentId: rebuttal.argument_id,
            side: rebuttal.side,
            counterargument: rebuttal.counterargument,
            rebuttal: rebuttal.rebuttal,
            position: rebuttal.position,
          })),

          sources: (sourcesByMotion.get(motion.id) ?? []).map((source) => ({
            id: source.id,
            organization: source.organization,
            title: source.title,
            url: source.url,
            description: source.description,
            position: source.position,
          })),

          keywords: (keywordsByMotion.get(motion.id) ?? []).map((keyword) => ({
            id: keyword.id,
            language: keyword.language,
            keyword: keyword.keyword,
            position: keyword.position,
          })),
        };
      }),
    });
  } catch (error) {
    console.error('Failed to load motion knowledge:', error);

    return json(
      {
        error: 'Failed to load motion knowledge',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}
