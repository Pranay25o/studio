export type Role = 'student' | 'teacher';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  prn?: string; // For students
  subjects?: string[]; // For teachers, list of subjects they can manage
}

export interface Mark {
  id: string;
  studentId: string; // PRN
  subject: string;
  score: number;
  maxScore: number;
  term: string; // e.g., "Midterm", "Final", "Assignment 1"
  grade?: string; // Optional, e.g., "A+", "B"
}

export interface Student {
  id: string; // PRN
  name: string;
  email?: string; // Optional, if student user links to this
  marks: Mark[];
}

// For GenAI flows
export interface GradeAnomalyInput {
  studentName: string;
  prnNumber: string;
  subjectName: string;
  grade: number;
  maxGrade: number;
}

export interface MarksSuggestionInput {
  prn: string;
  name: string;
  subject: string;
  maxMarks: number;
}
