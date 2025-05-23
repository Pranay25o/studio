import type { Student, User, Mark, Role } from '@/types';

export const mockUsers: User[] = [
  { id: 'teacher1', email: 'teacher@example.com', name: 'Prof. Ada Lovelace', role: 'teacher' },
  { id: 'student1', email: 'student1@example.com', name: 'Alice Smith', role: 'student', prn: 'PRN001' },
  { id: 'student2', email: 'student2@example.com', name: 'Bob Johnson', role: 'student', prn: 'PRN002' },
];

export const mockMarks: Mark[] = [
  { id: 'mark1', studentId: 'PRN001', subject: 'Mathematics', score: 85, maxScore: 100, term: 'Midterm', grade: 'A' },
  { id: 'mark2', studentId: 'PRN001', subject: 'Physics', score: 78, maxScore: 100, term: 'Midterm', grade: 'B+' },
  { id: 'mark3', studentId: 'PRN001', subject: 'Mathematics', score: 92, maxScore: 100, term: 'Final', grade: 'A+' },
  { id: 'mark4', studentId: 'PRN002', subject: 'Mathematics', score: 70, maxScore: 100, term: 'Midterm', grade: 'B' },
  { id: 'mark5', studentId: 'PRN002', subject: 'Chemistry', score: 65, maxScore: 100, term: 'Midterm', grade: 'C+' },
];

export const mockStudents: Student[] = [
  {
    id: 'PRN001',
    name: 'Alice Smith',
    email: 'student1@example.com',
    marks: mockMarks.filter(m => m.studentId === 'PRN001'),
  },
  {
    id: 'PRN002',
    name: 'Bob Johnson',
    email: 'student2@example.com',
    marks: mockMarks.filter(m => m.studentId === 'PRN002'),
  },
  {
    id: 'PRN003',
    name: 'Charlie Brown',
    email: 'student3@example.com',
    marks: [],
  },
];

// Helper functions to interact with mock data (simulating API calls)
export const getStudentByPrn = async (prn: string): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
  return mockStudents.find(s => s.id === prn);
};

export const getAllStudents = async (): Promise<Student[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockStudents;
};

export const addMark = async (mark: Omit<Mark, 'id'>): Promise<Mark> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const newMark: Mark = { ...mark, id: `mark${mockMarks.length + 1}` };
  mockMarks.push(newMark);
  const student = mockStudents.find(s => s.id === mark.studentId);
  if (student) {
    student.marks.push(newMark);
  }
  return newMark;
};

export const updateMark = async (updatedMark: Mark): Promise<Mark | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const markIndex = mockMarks.findIndex(m => m.id === updatedMark.id);
  if (markIndex !== -1) {
    mockMarks[markIndex] = updatedMark;
    const student = mockStudents.find(s => s.id === updatedMark.studentId);
    if (student) {
      const studentMarkIndex = student.marks.findIndex(m => m.id === updatedMark.id);
      if (studentMarkIndex !== -1) {
        student.marks[studentMarkIndex] = updatedMark;
      }
    }
    return updatedMark;
  }
  return undefined;
};

export const deleteMark = async (markId: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const markIndex = mockMarks.findIndex(m => m.id === markId);
  if (markIndex !== -1) {
    const studentId = mockMarks[markIndex].studentId;
    mockMarks.splice(markIndex, 1);
    const student = mockStudents.find(s => s.id === studentId);
    if (student) {
      student.marks = student.marks.filter(m => m.id !== markId);
    }
    return true;
  }
  return false;
};

export const updateStudentName = async (prn: string, newName: string): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const student = mockStudents.find(s => s.id === prn);
  if (student) {
    student.name = newName;
    const user = mockUsers.find(u => u.prn === prn);
    if (user) {
      user.name = newName;
    }
    return student;
  }
  return undefined;
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockUsers.find(u => u.email === email);
}

export const createUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const newUser: User = { ...userData, id: `user${mockUsers.length + 1}`};
  if (userData.role === 'student' && !userData.prn) {
    newUser.prn = `PRN${String(mockStudents.length + 1).padStart(3, '0')}`;
  }
  mockUsers.push(newUser);
  if (newUser.role === 'student' && newUser.prn) {
    const existingStudent = mockStudents.find(s => s.id === newUser.prn);
    if (!existingStudent) {
       mockStudents.push({id: newUser.prn, name: newUser.name, email: newUser.email, marks: [] });
    } else {
      existingStudent.name = newUser.name; // Update name if PRN exists
      existingStudent.email = newUser.email;
    }
  }
  return newUser;
}
