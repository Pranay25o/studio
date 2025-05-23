'use server';
/**
 * @fileOverview AI-powered grade anomaly detection flow.
 *
 * - detectGradeAnomalies - A function that detects grade anomalies.
 * - DetectGradeAnomaliesInput - The input type for the detectGradeAnomalies function.
 * - DetectGradeAnomaliesOutput - The return type for the detectGradeAnomalies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectGradeAnomaliesInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  prnNumber: z.string().describe('The PRN (Permanent Registration Number) of the student.'),
  subjectName: z.string().describe('The name of the subject.'),
  grade: z.number().describe('The grade obtained by the student in the subject.'),
  maxGrade: z.number().describe('The maximum possible grade for the subject.'),
});
export type DetectGradeAnomaliesInput = z.infer<typeof DetectGradeAnomaliesInputSchema>;

const DetectGradeAnomaliesOutputSchema = z.object({
  isAnomalous: z.boolean().describe('Whether the grade is anomalous or not.'),
  explanation: z.string().describe('The explanation for why the grade is considered anomalous.'),
  suggestedGrade: z.number().optional().describe('The suggested grade if the grade is anomalous.'),
});
export type DetectGradeAnomaliesOutput = z.infer<typeof DetectGradeAnomaliesOutputSchema>;

export async function detectGradeAnomalies(input: DetectGradeAnomaliesInput): Promise<DetectGradeAnomaliesOutput> {
  return detectGradeAnomaliesFlow(input);
}

const detectGradeAnomaliesPrompt = ai.definePrompt({
  name: 'detectGradeAnomaliesPrompt',
  input: {schema: DetectGradeAnomaliesInputSchema},
  output: {schema: DetectGradeAnomaliesOutputSchema},
  prompt: `You are an expert teacher who can automatically detect grade anomalies, such as out-of-bounds grades, for a student.

  Given the following information about a student's grade, determine if the grade is anomalous or not. If the grade is anomalous, provide an explanation and suggest a corrected grade.

  Student Name: {{{studentName}}}
  PRN Number: {{{prnNumber}}}
  Subject Name: {{{subjectName}}}
  Grade: {{{grade}}}
  Maximum Grade: {{{maxGrade}}}

  Consider a grade to be anomalous if it is:
  - Out of the possible grade bounds (e.g., negative or greater than the maximum grade).
  - Significantly different from what would be expected, based on your knowledge as a teacher (e.g. a near perfect score when the student has struggled).
  `,
});

const detectGradeAnomaliesFlow = ai.defineFlow(
  {
    name: 'detectGradeAnomaliesFlow',
    inputSchema: DetectGradeAnomaliesInputSchema,
    outputSchema: DetectGradeAnomaliesOutputSchema,
  },
  async input => {
    const {output} = await detectGradeAnomaliesPrompt(input);
    return output!;
  }
);
