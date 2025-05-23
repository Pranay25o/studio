
export type Role = 'student' | 'teacher' | 'admin';

export type Semester = string; // e.g., "Semester 1, 2023-2024", "Fall 2024"

export interface TeacherSemesterAssignment {
  semester: Semester;
  subjects: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  prn?: string; // For students
  subjects?: string[]; // General subjects (e.g., for admin oversight or non-semester specific roles)
  semesterAssignments?: TeacherSemesterAssignment[]; // For teachers, subjects assigned per semester
}

export type AssessmentType = 'CA1' | 'CA2' | 'MidSem' | 'EndSem';

export const ASSESSMENT_MAX_SCORES: Record<AssessmentType, number> = {
  CA1: 10,
  CA2: 10,
  MidSem: 20,
  EndSem: 60,
};

export interface Mark {
  id: string;
  studentId: string; // PRN
  subject: string;
  assessmentType: AssessmentType;
  score: number;
  maxScore: number; // Will be 10, 20, or 60 based on assessmentType
  semester: Semester; // Added semester field
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
  grade: number; // This will now be the score for a specific assessment component
  maxGrade: number; // This will be the maxScore for that component (10, 20, or 60)
}

export interface MarksSuggestionInput {
  prn: string;
  name: string;
  subject: string;
  assessmentType: AssessmentType; // Added
  maxMarks: number; // Max marks for the specific assessmentType
}

