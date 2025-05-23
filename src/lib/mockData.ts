
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

// ##########################################################################
// #                                                                        #
// #       🚨 IMPORTANT: FIREBASE CONFIGURATION REQUIRED 🚨                 #
// #                                                                        #
// #  This app uses Firebase Firestore for SOME data (semesters).           #
// #  Ensure `src/lib/firebaseConfig.ts` has your ACTUAL Firebase project   #
// #  credentials. Failure to do so will prevent Firestore-dependent        #
// #  features from working.                                                #
// #                                                                        #
// #  Placeholder values (like "YOUR_API_KEY_HERE") MUST be replaced.       #
// #  Check the comments in `src/lib/firebaseConfig.ts` for instructions.   #
// #                                                                        #
// ##########################################################################


export let mockUsers: User[] = [
  { 
    id: 'teacher1', 
    email: 'teacher@example.com', 
    name: 'Prof. Ada Lovelace', 
    role: 'teacher', 
    subjects: ['Mathematics', 'Physics'], // General oversight subjects
    semesterAssignments: [
      { semester: "Fall 2023", subjects: ['Mathematics', 'Physics'] },
      { semester: "Spring 2024", subjects: ['Mathematics'] }
    ]
  },
  { 
    id: 'teacher2', 
    email: 'prof.curie@example.com', 
    name: 'Prof. Marie Curie', 
    role: 'teacher', 
    subjects: ['Chemistry', 'Advanced Physics'],
    semesterAssignments: [
      { semester: "Fall 2023", subjects: ['Chemistry'] },
      { semester: "Spring 2024", subjects: ['Chemistry', 'Advanced Physics'] }
    ]
  },
  { id: 'student1', email: 'student1@example.com', name: 'Alice Smith', role: 'student', prn: 'PRN001' },
  { id: 'student2', email: 'student2@example.com', name: 'Bob Johnson', role: 'student', prn: 'PRN002' },
  { id: 'admin01', email: 'admin@example.com', name: 'Super Admin', role: 'admin', subjects: ['Mathematics', 'Physics', 'Chemistry', 'Advanced Physics'], semesterAssignments: [
      { semester: "Fall 2023", subjects: ['Mathematics', 'Physics',  'Chemistry'] },
      { semester: "Spring 2024", subjects: ['Mathematics', 'Advanced Physics', 'Chemistry'] }
  ] },
];

export let mockMarks: Mark[] = [
  // Alice Smith - PRN001
  { id: 'mark1', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'CA1', score: 8, maxScore: ASSESSMENT_MAX_SCORES.CA1, semester: "Fall 2023" },
  { id: 'mark2', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'CA2', score: 7, maxScore: ASSESSMENT_MAX_SCORES.CA2, semester: "Fall 2023" },
  { id: 'mark3', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'MidSem', score: 15, maxScore: ASSESSMENT_MAX_SCORES.MidSem, semester: "Fall 2023" },
  { id: 'mark4', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'EndSem', score: 48, maxScore: ASSESSMENT_MAX_SCORES.EndSem, semester: "Fall 2023" },
  
  { id: 'mark5', studentId: 'PRN001', subject: 'Physics', assessmentType: 'CA1', score: 9, maxScore: ASSESSMENT_MAX_SCORES.CA1, semester: "Fall 2023" },
  { id: 'mark6', studentId: 'PRN001', subject: 'Physics', assessmentType: 'MidSem', score: 18, maxScore: ASSESSMENT_MAX_SCORES.MidSem, semester: "Fall 2023" },
  { id: 'mark11', studentId: 'PRN001', subject: 'Physics', assessmentType: 'EndSem', score: 50, maxScore: ASSESSMENT_MAX_SCORES.EndSem, semester: "Fall 2023" },

  { id: 'mark12', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'CA1', score: 9, maxScore: ASSESSMENT_MAX_SCORES.CA1, semester: "Spring 2024" }, // Alice, Maths, Spring 2024

  // Bob Johnson - PRN002
  { id: 'mark7', studentId: 'PRN002', subject: 'Mathematics', assessmentType: 'CA1', score: 6, maxScore: ASSESSMENT_MAX_SCORES.CA1, semester: "Fall 2023" },
  { id: 'mark8', studentId: 'PRN002', subject: 'Mathematics', assessmentType: 'EndSem', score: 40, maxScore: ASSESSMENT_MAX_SCORES.EndSem, semester: "Fall 2023" },
  { id: 'mark9', studentId: 'PRN002', subject: 'Chemistry', assessmentType: 'CA1', score: 7, maxScore: ASSESSMENT_MAX_SCORES.CA1, semester: "Spring 2024" },
  { id: 'mark10', studentId: 'PRN002', subject: 'Chemistry', assessmentType: 'MidSem', score: 12, maxScore: ASSESSMENT_MAX_SCORES.MidSem, semester: "Spring 2024" },
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
    marks: [], // No marks initially for Charlie
  },
];

// --- System Subject Management Functions (MOCK DATA) ---
// Firestore-backed subject management has been removed.
// Subjects are now managed via this mock list.
export let mockSystemSubjects: string[] = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Computer Science",
  "English Literature",
  "Advanced Physics" // Ensure this is available if assigned
].sort();


export const getAllAvailableSubjects = (): string[] => {
  // Simulate async if needed later, but for now, direct return from mock.
  // await new Promise(resolve => setTimeout(resolve, 50));
  return [...mockSystemSubjects];
};


// --- Semester Management Functions (Using Firestore) ---
const semestersCollectionRef = collection(db, "semesters"); // Renamed for clarity

export const getSemesters = async (): Promise<Semester[]> => {
  try {
    const q = query(semestersCollectionRef, orderBy("name"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data().name as string);
  } catch (error: any) {
    console.error("Error fetching semesters from Firestore:", error);
    // Check for specific misconfiguration error related to API key
    const currentConfigApiKey = (typeof window !== "undefined" && (window as any).firebase?.app?.options?.apiKey) || db.app.options.apiKey;
    if (currentConfigApiKey === "YOUR_API_KEY_HERE" || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "YOUR_API_KEY_HERE") {
        console.warn("Firestore connection failed for semesters: Firebase config seems to be using placeholder values.");
        throw new Error("FirebaseMisconfigured");
    }
    // For other errors, return empty or rethrow as appropriate
    return []; 
  }
};

export const addSemester = async (semesterName: string): Promise<boolean> => {
  const trimmedName = semesterName.trim();
  if (!trimmedName) return false;
  try {
    // Check if the semester already exists (case-insensitive)
    const qCheck = query(semestersCollectionRef, where("nameLower", "==", trimmedName.toLowerCase()));
    const checkSnapshot = await getDocs(qCheck);
    if (!checkSnapshot.empty) {
      console.warn(`Semester "${trimmedName}" already exists in Firestore.`);
      return false; // Indicate that the semester was not added because it exists
    }
    // Add the new semester
    await addDoc(semestersCollectionRef, { name: trimmedName, nameLower: trimmedName.toLowerCase() });
    return true; // Indicate success
  } catch (error) {
    console.error("Error adding semester to Firestore:", error);
    return false; // Indicate failure
  }
};

export const renameSemester = async (oldName: string, newName: string): Promise<boolean> => {
  const trimmedOldName = oldName.trim();
  const trimmedNewName = newName.trim();

  if (!trimmedOldName || !trimmedNewName || trimmedOldName.toLowerCase() === trimmedNewName.toLowerCase()) {
    // If names are empty or the same (case-insensitive), consider it a no-op or invalid operation
    return false;
  }

  try {
    // Check if the new name already exists (excluding the current item being renamed)
    const newNameCheckQuery = query(semestersCollectionRef, where("nameLower", "==", trimmedNewName.toLowerCase()));
    const newNameCheckSnapshot = await getDocs(newNameCheckQuery);
    if (!newNameCheckSnapshot.empty) {
        let isSelf = false;
        // Ensure we are not conflicting with another existing semester
        for (const docSnapshot of newNameCheckSnapshot.docs) {
            if (docSnapshot.data().nameLower !== trimmedOldName.toLowerCase()) {
                 console.warn(`New semester name "${trimmedNewName}" already exists in Firestore and is not the item being renamed.`);
                 return false; // New name conflicts with another existing semester
            }
        }
    }
    
    // Find the document(s) for the old semester name
    const q = query(semestersCollectionRef, where("nameLower", "==", trimmedOldName.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn(`Semester "${trimmedOldName}" not found for renaming in Firestore.`);
      return false; // Old name not found
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(docSnapshot => {
      batch.update(doc(db, "semesters", docSnapshot.id), { name: trimmedNewName, nameLower: trimmedNewName.toLowerCase() });
    });
    await batch.commit();
    
    // Update mockUsers that might have assignments with this semester
    mockUsers.forEach(user => {
      if (user.semesterAssignments) {
        user.semesterAssignments.forEach(assignment => {
          if (assignment.semester.toLowerCase() === trimmedOldName.toLowerCase()) {
            assignment.semester = trimmedNewName;
          }
        });
      }
    });
    // Update mockMarks that might reference this semester
     mockMarks.forEach(mark => {
        if (mark.semester.toLowerCase() === trimmedOldName.toLowerCase()) {
            mark.semester = trimmedNewName;
        }
    });
    // Update mockStudents' marks arrays
    mockStudents.forEach(student => {
        student.marks.forEach(mark => {
            if(mark.semester.toLowerCase() === trimmedOldName.toLowerCase()) {
                mark.semester = trimmedNewName;
            }
        });
    });


    return true; // Indicate success
  } catch (error) {
    console.error("Error renaming semester in Firestore:", error);
    return false; // Indicate failure
  }
};

export const deleteSemester = async (semesterName: string): Promise<boolean> => {
  const trimmedName = semesterName.trim();
  if (!trimmedName) return false;

  try {
    const q = query(semestersCollectionRef, where("nameLower", "==", trimmedName.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn(`Semester "${trimmedName}" not found for deletion in Firestore.`);
      return false; // Not found
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(docSnapshot => {
      batch.delete(doc(db, "semesters", docSnapshot.id));
    });
    await batch.commit();

    // Update mockUsers: remove assignments for this semester
    mockUsers.forEach(user => {
      if (user.semesterAssignments) {
        user.semesterAssignments = user.semesterAssignments.filter(
          assignment => assignment.semester.toLowerCase() !== trimmedName.toLowerCase()
        );
      }
    });
    // Update mockMarks: remove marks for this semester
    // This is a destructive operation on marks; consider if this is desired or if they should be archived/handled differently.
    const initialMarksLength = mockMarks.length;
    mockMarks = mockMarks.filter(mark => mark.semester.toLowerCase() !== trimmedName.toLowerCase());
    console.log(`Deleted ${initialMarksLength - mockMarks.length} marks associated with semester ${trimmedName}`);

    // Update mockStudents: remove marks for this semester from each student's list
    mockStudents.forEach(student => {
        student.marks = student.marks.filter(mark => mark.semester.toLowerCase() !== trimmedName.toLowerCase());
    });


    return true; // Indicate success
  } catch (error)
    {
    console.error("Error deleting semester from Firestore:", error);
    return false; // Indicate failure
  }
};


// --- Existing Mock Functions (for users, students, marks - to be migrated later) ---

export const getStudentByPrn = async (prn: string): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
  const student = mockStudents.find(s => s.id === prn);
  if (student) {
    // Ensure marks are up-to-date from the global mockMarks array
    const studentMarks = mockMarks.filter(m => m.studentId === prn);
    return { ...student, marks: studentMarks };
  }
  return undefined;
};

export const getAllStudents = async (): Promise<Student[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockStudents.map(s => ({
    ...s,
    marks: mockMarks.filter(m => m.studentId === s.id) // Ensure fresh marks
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
  const newMark: Mark = { ...markData, id: `mark${mockMarks.length + 1}${Date.now()}` }; // Make ID more unique
  mockMarks.push(newMark);
  const studentIndex = mockStudents.findIndex(s => s.id === markData.studentId);
  if (studentIndex !== -1) {
    // Ensure the student's marks array is also updated directly for consistency
    // as some parts of the app might read from student.marks directly before a full refresh
    mockStudents[studentIndex].marks.push(newMark);
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
         // This case should ideally not happen if data is consistent, but as a fallback:
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
    const userIndex = mockUsers.findIndex(u => u.prn === prn); // Check if a corresponding user exists
    if (userIndex !== -1 && mockUsers[userIndex].role === 'student') {
      mockUsers[userIndex].name = newName;
    }
    return mockStudents[studentIndex];
  }
  return undefined;
};

export const getUserByEmail = async (emailInput: string): Promise<User | undefined> => {
  const trimmedEmail = emailInput.trim().toLowerCase();
  console.log('[getUserByEmail] Received email to search for (trimmed, lowercased):', trimmedEmail);
  await new Promise(resolve => setTimeout(resolve, 50)); 
  
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
    id: `user${mockUsers.length + 1}${Date.now()}`, // Make ID more unique
    subjects: userData.subjects || [],
    semesterAssignments: userData.semesterAssignments || [] 
  };
  if (userData.role === 'student' && !userData.prn) {
    // Generate a simple PRN if not provided for a student
    newUser.prn = `PRN${String(mockStudents.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`;
  } else if (userData.role === 'student' && userData.prn) {
    newUser.prn = userData.prn.trim().toUpperCase(); // Ensure PRN is uppercase
  }
  
  mockUsers.push(newUser);

  // If a student is created, ensure they are also added to the mockStudents list
  // or updated if they already exist by PRN.
  if (newUser.role === 'student' && newUser.prn) {
    const existingStudentIndex = mockStudents.findIndex(s => s.id === newUser.prn);
    if (existingStudentIndex === -1) {
       mockStudents.push({id: newUser.prn, name: newUser.name, email: newUser.email, marks: [] });
    } else {
      // If student with PRN exists, update their name and email if different
      mockStudents[existingStudentIndex].name = newUser.name; 
      mockStudents[existingStudentIndex].email = newUser.email; // Assuming email on student record is desired
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
      // If no subjects are provided for an existing assignment, remove the assignment
      user.semesterAssignments.splice(existingSemesterAssignmentIndex, 1);
    } else {
      user.semesterAssignments[existingSemesterAssignmentIndex].subjects = sortedSubjects;
    }
  } else if (sortedSubjects.length > 0) { 
    // Only add a new assignment if there are subjects to assign
    user.semesterAssignments.push({ semester, subjects: sortedSubjects });
    user.semesterAssignments.sort((a, b) => a.semester.localeCompare(b.semester)); 
  }
  
  return user;
};
