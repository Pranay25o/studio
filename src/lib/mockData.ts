
import type { Student, User, Mark, Role, AssessmentType, Semester, TeacherSemesterAssignment } from '@/types';
import { ASSESSMENT_MAX_SCORES } from '@/types';
import { db } from './firebaseConfig'; // Import Firestore instance
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  writeBatch
} from "firebase/firestore";

export let mockSemesters: Semester[] = [
  "Semester 1, 2023-2024",
  "Semester 2, 2023-2024",
  "Semester 1, 2024-2025",
  "Semester 2, 2024-2025",
].sort();

export let mockUsers: User[] = [
  { 
    id: 'teacher1', 
    email: 'teacher@example.com', 
    name: 'Prof. Ada Lovelace', 
    role: 'teacher', 
    subjects: ['Mathematics', 'Physics'], // General oversight subjects
    semesterAssignments: [
      { semester: "Semester 1, 2023-2024", subjects: ['Mathematics', 'Physics'] },
      { semester: "Semester 2, 2023-2024", subjects: ['Mathematics'] }
    ]
  },
  { 
    id: 'teacher2', 
    email: 'prof.curie@example.com', 
    name: 'Prof. Marie Curie', 
    role: 'teacher', 
    subjects: ['Chemistry', 'Advanced Physics'],
    semesterAssignments: [
      { semester: "Semester 1, 2023-2024", subjects: ['Chemistry'] },
      { semester: "Semester 2, 2023-2024", subjects: ['Chemistry', 'Advanced Physics'] }
    ]
  },
  { id: 'student1', email: 'student1@example.com', name: 'Alice Smith', role: 'student', prn: 'PRN001' },
  { id: 'student2', email: 'student2@example.com', name: 'Bob Johnson', role: 'student', prn: 'PRN002' },
  { id: 'admin01', email: 'admin@example.com', name: 'Super Admin', role: 'admin', subjects: [], semesterAssignments: [] },
];

export let mockMarks: Mark[] = [
  // Alice Smith - PRN001
  { id: 'mark1', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'CA1', score: 8, maxScore: ASSESSMENT_MAX_SCORES.CA1 },
  { id: 'mark2', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'CA2', score: 7, maxScore: ASSESSMENT_MAX_SCORES.CA2 },
  { id: 'mark3', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'MidSem', score: 15, maxScore: ASSESSMENT_MAX_SCORES.MidSem },
  { id: 'mark4', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'EndSem', score: 48, maxScore: ASSESSMENT_MAX_SCORES.EndSem },
  { id: 'mark5', studentId: 'PRN001', subject: 'Physics', assessmentType: 'CA1', score: 9, maxScore: ASSESSMENT_MAX_SCORES.CA1 },
  { id: 'mark6', studentId: 'PRN001', subject: 'Physics', assessmentType: 'MidSem', score: 18, maxScore: ASSESSMENT_MAX_SCORES.MidSem },
  { id: 'mark11', studentId: 'PRN001', subject: 'Physics', assessmentType: 'EndSem', score: 50, maxScore: ASSESSMENT_MAX_SCORES.EndSem },


  // Bob Johnson - PRN002
  { id: 'mark7', studentId: 'PRN002', subject: 'Mathematics', assessmentType: 'CA1', score: 6, maxScore: ASSESSMENT_MAX_SCORES.CA1 },
  { id: 'mark8', studentId: 'PRN002', subject: 'Mathematics', assessmentType: 'EndSem', score: 40, maxScore: ASSESSMENT_MAX_SCORES.EndSem },
  { id: 'mark9', studentId: 'PRN002', subject: 'Chemistry', assessmentType: 'CA1', score: 7, maxScore: ASSESSMENT_MAX_SCORES.CA1 },
  { id: 'mark10', studentId: 'PRN002', subject: 'Chemistry', assessmentType: 'MidSem', score: 12, maxScore: ASSESSMENT_MAX_SCORES.MidSem },
];

export let mockStudents: Student[] = [
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

// --- System Subject Management Functions (Now using Firestore) ---
const systemSubjectsCollection = collection(db, "systemSubjects");

export const getAllAvailableSubjects = async (): Promise<string[]> => {
  try {
    const q = query(systemSubjectsCollection, orderBy("name"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data().name as string);
  } catch (error) {
    console.error("Error fetching system subjects from Firestore:", error);
    return []; // Return empty array on error
  }
};

export const addSystemSubject = async (subjectName: string): Promise<boolean> => {
  const trimmedName = subjectName.trim();
  if (!trimmedName) return false;

  try {
    // Check if subject already exists (case-insensitive for robustness, though Firestore queries are case-sensitive by default)
    const existingSubjects = await getAllAvailableSubjects();
    if (existingSubjects.some(s => s.toLowerCase() === trimmedName.toLowerCase())) {
      console.warn(`Subject "${trimmedName}" already exists.`);
      return false; // Subject already exists
    }
    
    await addDoc(systemSubjectsCollection, { name: trimmedName });
    return true;
  } catch (error) {
    console.error("Error adding system subject to Firestore:", error);
    return false;
  }
};

export const renameSystemSubject = async (oldName: string, newName: string): Promise<boolean> => {
  const trimmedOldName = oldName.trim();
  const trimmedNewName = newName.trim();

  if (!trimmedOldName || !trimmedNewName || trimmedOldName.toLowerCase() === trimmedNewName.toLowerCase()) return false;

  try {
    // Check if new name already exists
    const existingSubjects = await getAllAvailableSubjects();
    if (existingSubjects.some(s => s.toLowerCase() === trimmedNewName.toLowerCase() && s.toLowerCase() !== trimmedOldName.toLowerCase())) {
       console.warn(`New subject name "${trimmedNewName}" already exists or is the same as old name.`);
      return false;
    }
    
    const q = query(systemSubjectsCollection, where("name", "==", trimmedOldName));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn(`Subject "${trimmedOldName}" not found for renaming.`);
      return false; // Old name doesn't exist
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(docSnapshot => {
      batch.update(doc(db, "systemSubjects", docSnapshot.id), { name: trimmedNewName });
    });
    await batch.commit();

    // IMPORTANT: Propagating renames to mockUsers and mockMarks is complex
    // For a real app, this would involve updating related documents in 'users' and 'marks' collections.
    // This part is simplified for mock data and will need proper Firestore updates in a full migration.
    mockUsers.forEach(user => {
      if (user.subjects) {
        user.subjects = user.subjects.map(s => s === trimmedOldName ? trimmedNewName : s).sort();
      }
      if (user.semesterAssignments) {
        user.semesterAssignments.forEach(assignment => {
          assignment.subjects = assignment.subjects.map(s => s === trimmedOldName ? trimmedNewName : s).sort();
        });
      }
    });
    mockMarks.forEach(mark => {
      if (mark.subject === trimmedOldName) {
        mark.subject = trimmedNewName;
      }
    });
    mockStudents.forEach(student => {
      student.marks.forEach(mark => {
        if (mark.subject === trimmedOldName) {
          mark.subject = trimmedNewName;
        }
      });
    });

    return true;
  } catch (error) {
    console.error("Error renaming system subject in Firestore:", error);
    return false;
  }
};

export const deleteSystemSubject = async (subjectName: string): Promise<boolean> => {
  const trimmedName = subjectName.trim();
  if (!trimmedName) return false;

  try {
    const q = query(systemSubjectsCollection, where("name", "==", trimmedName));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn(`Subject "${trimmedName}" not found for deletion.`);
      return false;
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(docSnapshot => {
      batch.delete(doc(db, "systemSubjects", docSnapshot.id));
    });
    await batch.commit();
    
    // IMPORTANT: Propagating deletes to mockUsers and mockMarks is complex
    // In a real app, you'd need a strategy for handling related data.
    // For mock data:
    const replacementSubjectName = `Archived Subject (${trimmedName})`;
    mockUsers.forEach(user => {
      if (user.subjects) {
        user.subjects = user.subjects.filter(s => s !== trimmedName).sort();
      }
      if (user.semesterAssignments) {
        user.semesterAssignments.forEach(assignment => {
          assignment.subjects = assignment.subjects.filter(s => s !== trimmedName).sort();
        });
      }
    });
    mockMarks.forEach(mark => {
      if (mark.subject === trimmedName) {
        mark.subject = replacementSubjectName; 
      }
    });
    mockStudents.forEach(student => {
      student.marks.forEach(mark => {
        if (mark.subject === trimmedName) {
          mark.subject = replacementSubjectName;
        }
      });
    });
    return true;
  } catch (error) {
    console.error("Error deleting system subject from Firestore:", error);
    return false;
  }
};


// --- Existing Mock Functions (to be migrated later) ---

export const getStudentByPrn = async (prn: string): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
  const student = mockStudents.find(s => s.id === prn);
  if (student) {
    return { ...student, marks: mockMarks.filter(m => m.studentId === prn) };
  }
  return undefined;
};

export const getAllStudents = async (): Promise<Student[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockStudents.map(s => ({
    ...s,
    marks: mockMarks.filter(m => m.studentId === s.id)
  }));
};

export const getAllTeachers = async (): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockUsers.filter(user => user.role === 'teacher');
};

export const getAllUsers = async (): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...mockUsers];
};


export const addMark = async (markData: Omit<Mark, 'id'>): Promise<Mark> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const newMark: Mark = { ...markData, id: `mark${mockMarks.length + 1}` };
  mockMarks.push(newMark);
  const studentIndex = mockStudents.findIndex(s => s.id === markData.studentId);
  if (studentIndex !== -1) {
    const studentMarks = mockMarks.filter(m => m.studentId === markData.studentId);
    mockStudents[studentIndex].marks = studentMarks;
  }
  return newMark;
};

export const updateMark = async (updatedMark: Mark): Promise<Mark | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const markIndex = mockMarks.findIndex(m => m.id === updatedMark.id);
  if (markIndex !== -1) {
    mockMarks[markIndex] = updatedMark;
    const studentIndex = mockStudents.findIndex(s => s.id === updatedMark.studentId);
    if (studentIndex !== -1) {
      const studentMarkIndex = mockStudents[studentIndex].marks.findIndex(m => m.id === updatedMark.id);
      if (studentMarkIndex !== -1) {
        mockStudents[studentIndex].marks[studentMarkIndex] = updatedMark;
      } else { 
         mockStudents[studentIndex].marks.push(updatedMark);
      }
    }
    return updatedMark;
  }
  return undefined;
};

export const deleteMark = async (markId: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const markIndex = mockMarks.findIndex(m => m.id === markId);
  if (markIndex !== -1) {
    const studentId = mockMarks[markIndex].studentId;
    mockMarks.splice(markIndex, 1);
    const studentIndex = mockStudents.findIndex(s => s.id === studentId);
    if (studentIndex !== -1) {
      mockStudents[studentIndex].marks = mockStudents[studentIndex].marks.filter(m => m.id !== markId);
    }
    return true;
  }
  return false;
};

export const updateStudentName = async (prn: string, newName: string): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const studentIndex = mockStudents.findIndex(s => s.id === prn);
  if (studentIndex !== -1) {
    mockStudents[studentIndex].name = newName;
    const userIndex = mockUsers.findIndex(u => u.prn === prn);
    if (userIndex !== -1) {
      mockUsers[userIndex].name = newName;
    }
    return mockStudents[studentIndex];
  }
  return undefined;
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  console.log('[getUserByEmail] Received email to search for:', email);
  await new Promise(resolve => setTimeout(resolve, 50)); 

  const trimmedEmail = email.trim().toLowerCase();
  console.log('[getUserByEmail] Searching for trimmed email:', trimmedEmail);
  
  const foundUser = mockUsers.find(u => u.email.toLowerCase() === trimmedEmail);
  if (foundUser) {
    console.log('[getUserByEmail] Found user (from MOCK):', JSON.stringify(foundUser));
  } else {
    console.log('[getUserByEmail] User NOT found for email (from MOCK - trimmed, case-insensitive):', trimmedEmail);
  }
  return foundUser;
}

export const createUser = async (userData: Omit<User, 'id'> & { subjects?: string[], semesterAssignments?: TeacherSemesterAssignment[] }): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const newUser: User = { 
    ...userData, 
    id: `user${mockUsers.length + 1}`,
    subjects: userData.subjects || [],
    semesterAssignments: userData.semesterAssignments || [] 
  };
  if (userData.role === 'student' && !userData.prn) {
    newUser.prn = `PRN${String(mockStudents.length + 1).padStart(3, '0')}`;
  }
  
  mockUsers.push(newUser);

  if (newUser.role === 'student' && newUser.prn) {
    const existingStudentIndex = mockStudents.findIndex(s => s.id === newUser.prn);
    if (existingStudentIndex === -1) {
       mockStudents.push({id: newUser.prn, name: newUser.name, email: newUser.email, marks: [] });
    } else {
      mockStudents[existingStudentIndex].name = newUser.name; 
      mockStudents[existingStudentIndex].email = newUser.email;
    }
  }
  return newUser;
}

export const assignSubjectsToTeacher = async (userId: string, subjects: string[]): Promise<User | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const userIndex = mockUsers.findIndex(u => u.id === userId && (u.role === 'teacher' || u.role === 'admin'));
  if (userIndex !== -1) {
    mockUsers[userIndex].subjects = [...subjects].sort();
    return mockUsers[userIndex];
  }
  return undefined;
};


export const getSemesters = async (): Promise<Semester[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...mockSemesters];
};

export const assignSubjectsToTeacherForSemester = async (userId: string, semester: Semester, subjects: string[]): Promise<User | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const userIndex = mockUsers.findIndex(u => u.id === userId && (u.role === 'teacher' || u.role === 'admin'));
  if (userIndex === -1) return undefined;

  const user = mockUsers[userIndex];
  if (!user.semesterAssignments) {
    user.semesterAssignments = [];
  }

  const existingSemesterAssignmentIndex = user.semesterAssignments.findIndex(sa => sa.semester === semester);
  const sortedSubjects = [...subjects].sort();

  if (existingSemesterAssignmentIndex !== -1) {
    if (sortedSubjects.length === 0) { 
      user.semesterAssignments.splice(existingSemesterAssignmentIndex, 1);
    } else {
      user.semesterAssignments[existingSemesterAssignmentIndex].subjects = sortedSubjects;
    }
  } else if (sortedSubjects.length > 0) { 
    user.semesterAssignments.push({ semester, subjects: sortedSubjects });
    user.semesterAssignments.sort((a, b) => a.semester.localeCompare(b.semester)); 
  }
  
  return user;
};
