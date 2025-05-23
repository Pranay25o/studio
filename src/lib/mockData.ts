
import type { Student, User, Mark, Role, AssessmentType, Semester, TeacherSemesterAssignment } from '@/types';
import { ASSESSMENT_MAX_SCORES } from '@/types';
import { db } from './firebaseConfig';
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
  writeBatch,
  getDoc,
  QueryConstraint,
  Timestamp, // For potential future use with timestamps
  runTransaction
} from "firebase/firestore";

// ##########################################################################
// #                                                                        #
// #       🚨 IMPORTANT: FIREBASE CONFIGURATION REQUIRED 🚨                 #
// #                                                                        #
// #  This app uses Firebase Firestore for data.                            #
// #  Ensure `src/lib/firebaseConfig.ts` has your ACTUAL Firebase project   #
// #  credentials. Failure to do so will prevent Firestore features from    #
// #  working.                                                              #
// #                                                                        #
// #  Placeholder values (like "YOUR_API_KEY_HERE") MUST be replaced.       #
// #  Check the comments in `src/lib/firebaseConfig.ts` for instructions.   #
// #                                                                        #
// ##########################################################################


// --- Collection References ---
const usersCollectionRef = collection(db, "users");
const marksCollectionRef = collection(db, "marks");
const systemSubjectsCollectionRef = collection(db, "systemSubjects");
const semestersCollectionRef = collection(db, "semesters");


// --- System Subject Management Functions (Firestore-backed) ---
export const getAllAvailableSubjects = async (): Promise<string[]> => {
  try {
    const q = query(systemSubjectsCollectionRef, orderBy("name"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data().name as string);
  } catch (error: any) {
    console.error("Error fetching system subjects from Firestore:", error);
    const currentConfigApiKey = (typeof window !== "undefined" && (window as any).firebase?.app?.options?.apiKey) || db.app.options.apiKey;
    if (currentConfigApiKey === "YOUR_API_KEY_HERE" || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "YOUR_API_KEY_HERE") {
        console.warn("Firestore connection failed for system subjects: Firebase config seems to be using placeholder values.");
        throw new Error("FirebaseMisconfigured");
    }
    return [];
  }
};

export const addSystemSubject = async (subjectName: string): Promise<boolean> => {
  const trimmedName = subjectName.trim();
  if (!trimmedName) return false;
  try {
    const qCheck = query(systemSubjectsCollectionRef, where("nameLower", "==", trimmedName.toLowerCase()));
    const checkSnapshot = await getDocs(qCheck);
    if (!checkSnapshot.empty) {
      console.warn(`System subject "${trimmedName}" already exists in Firestore.`);
      return false;
    }
    await addDoc(systemSubjectsCollectionRef, { name: trimmedName, nameLower: trimmedName.toLowerCase() });
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
    const newNameCheckQuery = query(systemSubjectsCollectionRef, where("nameLower", "==", trimmedNewName.toLowerCase()));
    const newNameCheckSnapshot = await getDocs(newNameCheckQuery);
    if (!newNameCheckSnapshot.empty && newNameCheckSnapshot.docs.some(d => d.data().nameLower !== trimmedOldName.toLowerCase())) {
      console.warn(`New subject name "${trimmedNewName}" already exists in Firestore and is not the item being renamed.`);
      return false;
    }

    const qOld = query(systemSubjectsCollectionRef, where("nameLower", "==", trimmedOldName.toLowerCase()));
    const oldSnapshot = await getDocs(qOld);
    if (oldSnapshot.empty) {
      console.warn(`System subject "${trimmedOldName}" not found for renaming in Firestore.`);
      return false;
    }

    const batch = writeBatch(db);
    oldSnapshot.forEach(docSnapshot => {
      batch.update(doc(db, "systemSubjects", docSnapshot.id), { name: trimmedNewName, nameLower: trimmedNewName.toLowerCase() });
    });
    
    // Also update in users' general subjects and semester assignments, and in marks
    // This part becomes more complex with Firestore. We'll need to query and update.
    const usersSnapshot = await getDocs(usersCollectionRef);
    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data() as User;
      let userModified = false;
      if (userData.subjects && userData.subjects.includes(trimmedOldName)) {
        userData.subjects = userData.subjects.map(s => s === trimmedOldName ? trimmedNewName : s).sort();
        userModified = true;
      }
      if (userData.semesterAssignments) {
        userData.semesterAssignments.forEach(sa => {
          if (sa.subjects.includes(trimmedOldName)) {
            sa.subjects = sa.subjects.map(s => s === trimmedOldName ? trimmedNewName : s).sort();
            userModified = true;
          }
        });
      }
      if (userModified) {
        batch.update(doc(db, "users", userDoc.id), { subjects: userData.subjects, semesterAssignments: userData.semesterAssignments });
      }
    });

    const marksQuery = query(marksCollectionRef, where("subject", "==", trimmedOldName));
    const marksSnapshot = await getDocs(marksQuery);
    marksSnapshot.forEach(markDoc => {
      batch.update(doc(db, "marks", markDoc.id), { subject: trimmedNewName });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error renaming system subject in Firestore and related data:", error);
    return false;
  }
};

export const deleteSystemSubject = async (subjectName: string): Promise<boolean> => {
  const trimmedName = subjectName.trim();
  if (!trimmedName) return false;
  try {
    const q = query(systemSubjectsCollectionRef, where("nameLower", "==", trimmedName.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.warn(`System subject "${trimmedName}" not found for deletion in Firestore.`);
      return false;
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(docSnapshot => {
      batch.delete(doc(db, "systemSubjects", docSnapshot.id));
    });

    // Also update in users' general subjects and semester assignments, and in marks (e.g., remove or nullify)
    const usersSnapshot = await getDocs(usersCollectionRef);
    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data() as User;
      let userModified = false;
      if (userData.subjects && userData.subjects.includes(trimmedName)) {
        userData.subjects = userData.subjects.filter(s => s !== trimmedName).sort();
        userModified = true;
      }
      if (userData.semesterAssignments) {
        userData.semesterAssignments.forEach(sa => {
          if (sa.subjects.includes(trimmedName)) {
            sa.subjects = sa.subjects.filter(s => s !== trimmedName).sort();
            userModified = true;
          }
        });
        // Remove semester assignments if they become empty
        userData.semesterAssignments = userData.semesterAssignments.filter(sa => sa.subjects.length > 0);
      }
      if (userModified) {
        batch.update(doc(db, "users", userDoc.id), { subjects: userData.subjects, semesterAssignments: userData.semesterAssignments });
      }
    });
    
    // For marks, you might choose to delete them or mark them as related to a deleted subject.
    // For simplicity, we'll delete marks associated with this subject. This is a destructive operation.
    const marksQuery = query(marksCollectionRef, where("subject", "==", trimmedName));
    const marksSnapshot = await getDocs(marksQuery);
    marksSnapshot.forEach(markDoc => {
      batch.delete(doc(db, "marks", markDoc.id));
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error deleting system subject from Firestore and related data:", error);
    return false;
  }
};


// --- Semester Management Functions (Using Firestore) ---
export const getSemesters = async (): Promise<Semester[]> => {
  try {
    const q = query(semestersCollectionRef, orderBy("name"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data().name as string);
  } catch (error: any) {
    console.error("Error fetching semesters from Firestore:", error);
    const currentConfigApiKey = (typeof window !== "undefined" && (window as any).firebase?.app?.options?.apiKey) || db.app.options.apiKey;
    if (currentConfigApiKey === "YOUR_API_KEY_HERE" || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "YOUR_API_KEY_HERE") {
        console.warn("Firestore connection failed for semesters: Firebase config seems to be using placeholder values.");
        throw new Error("FirebaseMisconfigured");
    }
    return [];
  }
};

export const addSemester = async (semesterName: string): Promise<boolean> => {
  const trimmedName = semesterName.trim();
  if (!trimmedName) return false;
  try {
    const qCheck = query(semestersCollectionRef, where("nameLower", "==", trimmedName.toLowerCase()));
    const checkSnapshot = await getDocs(qCheck);
    if (!checkSnapshot.empty) {
      console.warn(`Semester "${trimmedName}" already exists in Firestore.`);
      return false;
    }
    await addDoc(semestersCollectionRef, { name: trimmedName, nameLower: trimmedName.toLowerCase() });
    return true;
  } catch (error) {
    console.error("Error adding semester to Firestore:", error);
    return false;
  }
};

export const renameSemester = async (oldName: string, newName: string): Promise<boolean> => {
  const trimmedOldName = oldName.trim();
  const trimmedNewName = newName.trim();
  if (!trimmedOldName || !trimmedNewName || trimmedOldName.toLowerCase() === trimmedNewName.toLowerCase()) return false;

  try {
    const newNameCheckQuery = query(semestersCollectionRef, where("nameLower", "==", trimmedNewName.toLowerCase()));
    const newNameCheckSnapshot = await getDocs(newNameCheckQuery);
    if (!newNameCheckSnapshot.empty && newNameCheckSnapshot.docs.some(d => d.data().nameLower !== trimmedOldName.toLowerCase())) {
        console.warn(`New semester name "${trimmedNewName}" already exists in Firestore and is not the item being renamed.`);
        return false;
    }
    
    const qOld = query(semestersCollectionRef, where("nameLower", "==", trimmedOldName.toLowerCase()));
    const oldSnapshot = await getDocs(qOld);
    if (oldSnapshot.empty) {
      console.warn(`Semester "${trimmedOldName}" not found for renaming in Firestore.`);
      return false;
    }

    const batch = writeBatch(db);
    oldSnapshot.forEach(docSnapshot => {
      batch.update(doc(db, "semesters", docSnapshot.id), { name: trimmedNewName, nameLower: trimmedNewName.toLowerCase() });
    });

    // Update users' semesterAssignments and marks' semester field
    const usersSnapshot = await getDocs(usersCollectionRef);
    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data() as User;
      if (userData.semesterAssignments) {
        let modified = false;
        userData.semesterAssignments.forEach(sa => {
          if (sa.semester.toLowerCase() === trimmedOldName.toLowerCase()) {
            sa.semester = trimmedNewName;
            modified = true;
          }
        });
        if (modified) {
          batch.update(doc(db, "users", userDoc.id), { semesterAssignments: userData.semesterAssignments });
        }
      }
    });

    const marksQuery = query(marksCollectionRef, where("semester", "==", trimmedOldName)); // Assuming exact match for old semester name
    const marksSnapshot = await getDocs(marksQuery);
    marksSnapshot.forEach(markDoc => {
      batch.update(doc(db, "marks", markDoc.id), { semester: trimmedNewName });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error renaming semester in Firestore and related data:", error);
    return false;
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
      return false;
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(docSnapshot => {
      batch.delete(doc(db, "semesters", docSnapshot.id));
    });

    // Update users' semesterAssignments and delete marks for this semester
    const usersSnapshot = await getDocs(usersCollectionRef);
    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data() as User;
      if (userData.semesterAssignments) {
        const updatedAssignments = userData.semesterAssignments.filter(sa => sa.semester.toLowerCase() !== trimmedName.toLowerCase());
        if (updatedAssignments.length !== userData.semesterAssignments.length) {
          batch.update(doc(db, "users", userDoc.id), { semesterAssignments: updatedAssignments });
        }
      }
    });

    const marksQuery = query(marksCollectionRef, where("semester", "==", trimmedName)); // Assuming exact match
    const marksSnapshot = await getDocs(marksQuery);
    marksSnapshot.forEach(markDoc => {
      batch.delete(doc(db, "marks", markDoc.id));
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error deleting semester from Firestore and related data:", error);
    return false;
  }
};

// --- User Management Functions (Firestore-backed) ---
export const getUserByEmail = async (emailInput: string): Promise<User | undefined> => {
  const trimmedEmail = emailInput.trim().toLowerCase();
  console.log('[getUserByEmail] Received email to search for (trimmed, lowercased):', trimmedEmail);
  try {
    const q = query(usersCollectionRef, where("email", "==", trimmedEmail));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as Omit<User, 'id'>;
      console.log('[getUserByEmail] Found user (from Firestore):', JSON.stringify({ id: userDoc.id, ...userData }));
      return { id: userDoc.id, ...userData };
    }
    console.log('[getUserByEmail] User NOT found for email (from Firestore):', trimmedEmail);
    return undefined;
  } catch (error) {
    console.error("Error fetching user by email from Firestore:", error);
    return undefined;
  }
};

export const createUser = async (userData: Omit<User, 'id' | 'subjects' | 'semesterAssignments'> & { subjects?: string[], semesterAssignments?: TeacherSemesterAssignment[] }): Promise<User> => {
  try {
    const userToCreate: Omit<User, 'id'> = {
      email: userData.email.trim().toLowerCase(),
      name: userData.name.trim(),
      role: userData.role,
      prn: userData.role === 'student' && userData.prn ? userData.prn.trim().toUpperCase() : undefined,
      subjects: userData.subjects || [],
      semesterAssignments: userData.semesterAssignments || [],
    };

    // For students, if PRN is not provided, generate one (this might need a more robust unique generation in a real app)
    if (userToCreate.role === 'student' && !userToCreate.prn) {
      userToCreate.prn = `PRN${Date.now().toString().slice(-6)}`; // Simple PRN generation
    }
    
    // Check if student PRN already exists if role is student
    if (userToCreate.role === 'student' && userToCreate.prn) {
        const prnCheckQuery = query(usersCollectionRef, where("prn", "==", userToCreate.prn), where("role", "==", "student"));
        const prnCheckSnapshot = await getDocs(prnCheckQuery);
        if (!prnCheckSnapshot.empty) {
            throw new Error(`Student with PRN ${userToCreate.prn} already exists.`);
        }
    }


    const docRef = await addDoc(usersCollectionRef, userToCreate);
    return { id: docRef.id, ...userToCreate };
  } catch (error) {
    console.error("Error creating user in Firestore:", error);
    throw error; // Re-throw to be caught by AuthContext
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const querySnapshot = await getDocs(usersCollectionRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error) {
    console.error("Error fetching all users from Firestore:", error);
    return [];
  }
};

export const getAllTeachers = async (): Promise<User[]> => {
  try {
    const q = query(usersCollectionRef, where("role", "in", ["teacher", "admin"])); // Admins can also be teachers
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error) {
    console.error("Error fetching teachers from Firestore:", error);
    return [];
  }
};

export const assignSubjectsToTeacher = async (userId: string, subjects: string[]): Promise<User | undefined> => {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists() || (userDocSnap.data().role !== 'teacher' && userDocSnap.data().role !== 'admin')) {
      console.warn(`User ${userId} not found or not a teacher/admin.`);
      return undefined;
    }
    await updateDoc(userDocRef, { subjects: [...subjects].sort() });
    const updatedUserDoc = await getDoc(userDocRef); // Re-fetch to get updated data
    return { id: updatedUserDoc.id, ...updatedUserDoc.data() } as User;
  } catch (error) {
    console.error("Error assigning subjects to teacher in Firestore:", error);
    return undefined;
  }
};

export const assignSubjectsToTeacherForSemester = async (userId: string, semester: Semester, subjects: string[]): Promise<User | undefined> => {
  try {
    const userDocRef = doc(db, "users", userId);
    
    await runTransaction(db, async (transaction) => {
      const userDocSnap = await transaction.get(userDocRef);
      if (!userDocSnap.exists() || (userDocSnap.data().role !== 'teacher' && userDocSnap.data().role !== 'admin')) {
        throw new Error(`User ${userId} not found or not a teacher/admin.`);
      }

      const userData = userDocSnap.data() as User;
      let semesterAssignments = userData.semesterAssignments || [];
      const existingAssignmentIndex = semesterAssignments.findIndex(sa => sa.semester === semester);
      const sortedSubjects = [...subjects].sort();

      if (existingAssignmentIndex !== -1) {
        if (sortedSubjects.length === 0) {
          semesterAssignments.splice(existingAssignmentIndex, 1);
        } else {
          semesterAssignments[existingAssignmentIndex].subjects = sortedSubjects;
        }
      } else if (sortedSubjects.length > 0) {
        semesterAssignments.push({ semester, subjects: sortedSubjects });
        semesterAssignments.sort((a,b) => a.semester.localeCompare(b.semester));
      }
      transaction.update(userDocRef, { semesterAssignments });
    });

    const updatedUserDoc = await getDoc(userDocRef); // Re-fetch to get updated data
    return { id: updatedUserDoc.id, ...updatedUserDoc.data() } as User;

  } catch (error) {
    console.error("Error assigning subjects to teacher for semester in Firestore:", error);
    return undefined;
  }
};


// --- Student and Mark Management Functions (Firestore-backed) ---
export const getAllStudents = async (): Promise<Student[]> => {
  try {
    const studentUsersQuery = query(usersCollectionRef, where("role", "==", "student"));
    const studentUsersSnapshot = await getDocs(studentUsersQuery);
    
    const students: Student[] = [];
    for (const userDoc of studentUsersSnapshot.docs) {
      const userData = userDoc.data() as User;
      if (!userData.prn) continue; // Should not happen if PRN is mandatory for students

      const marksQuery = query(marksCollectionRef, where("studentId", "==", userData.prn));
      const marksSnapshot = await getDocs(marksQuery);
      const studentMarks: Mark[] = marksSnapshot.docs.map(markDoc => ({
        id: markDoc.id,
        ...markDoc.data()
      } as Mark));
      
      students.push({
        id: userData.prn, // Student ID is PRN
        name: userData.name,
        email: userData.email,
        marks: studentMarks,
      });
    }
    return students;
  } catch (error) {
    console.error("Error fetching all students from Firestore:", error);
    return [];
  }
};

export const getStudentByPrn = async (prn: string): Promise<Student | undefined> => {
  try {
    const studentUserQuery = query(usersCollectionRef, where("role", "==", "student"), where("prn", "==", prn));
    const studentUserSnapshot = await getDocs(studentUserQuery);

    if (studentUserSnapshot.empty) {
      console.warn(`Student user with PRN ${prn} not found.`);
      return undefined;
    }
    const userDoc = studentUserSnapshot.docs[0];
    const userData = userDoc.data() as User;

    const marksQuery = query(marksCollectionRef, where("studentId", "==", prn));
    const marksSnapshot = await getDocs(marksQuery);
    const studentMarks: Mark[] = marksSnapshot.docs.map(markDoc => ({
      id: markDoc.id,
      ...markDoc.data()
    } as Mark));

    return {
      id: userData.prn!,
      name: userData.name,
      email: userData.email,
      marks: studentMarks,
    };
  } catch (error) {
    console.error(`Error fetching student by PRN ${prn} from Firestore:`, error);
    return undefined;
  }
};

export const addMark = async (markData: Omit<Mark, 'id'>): Promise<Mark> => {
  try {
    // Ensure studentId (PRN) exists
    const studentQuery = query(usersCollectionRef, where("prn", "==", markData.studentId), where("role", "==", "student"));
    const studentSnapshot = await getDocs(studentQuery);
    if (studentSnapshot.empty) {
        throw new Error(`Student with PRN ${markData.studentId} not found. Cannot add mark.`);
    }

    const docRef = await addDoc(marksCollectionRef, markData);
    return { id: docRef.id, ...markData };
  } catch (error) {
    console.error("Error adding mark to Firestore:", error);
    throw error;
  }
};

export const updateMark = async (updatedMark: Mark): Promise<Mark | undefined> => {
  try {
    const markDocRef = doc(db, "marks", updatedMark.id);
    const { id, ...markDataToUpdate } = updatedMark; // Firestore update doesn't need the id in data
    await updateDoc(markDocRef, markDataToUpdate);
    return updatedMark;
  } catch (error) {
    console.error("Error updating mark in Firestore:", error);
    return undefined;
  }
};

export const deleteMark = async (markId: string): Promise<boolean> => {
  try {
    const markDocRef = doc(db, "marks", markId);
    await deleteDoc(markDocRef);
    return true;
  } catch (error) {
    console.error("Error deleting mark from Firestore:", error);
    return false;
  }
};

export const updateStudentName = async (prn: string, newName: string): Promise<Student | undefined> => {
  try {
    const studentUserQuery = query(usersCollectionRef, where("role", "==", "student"), where("prn", "==", prn));
    const studentUserSnapshot = await getDocs(studentUserQuery);

    if (studentUserSnapshot.empty) {
      console.warn(`Student user with PRN ${prn} not found for name update.`);
      return undefined;
    }
    const userDocToUpdate = studentUserSnapshot.docs[0];
    const userDocRef = doc(db, "users", userDocToUpdate.id);
    await updateDoc(userDocRef, { name: newName });

    // Re-fetch the student data to return it in Student format
    return await getStudentByPrn(prn);

  } catch (error) {
    console.error(`Error updating student name for PRN ${prn} in Firestore:`, error);
    return undefined;
  }
};

    