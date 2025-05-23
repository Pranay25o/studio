
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, KeyRound, User as UserIcon, Info, BookUser } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import type { Role, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getAllTeachers } from "@/lib/mockData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["student", "teacher", "admin"], { required_error: "You must select a role." }),
  prn: z.string().optional(),
}).refine(data => {
  if (data.role === 'student' && (!data.prn || data.prn.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "PRN is required for students.",
  path: ["prn"],
});


export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [teachersList, setTeachersList] = useState<User[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "student",
      prn: "",
    },
  });

  const selectedRole = form.watch("role");

  useEffect(() => {
    if (isClient && selectedRole === 'student') {
      const fetchTeachers = async () => {
        try {
          const assignableStaff = await getAllTeachers();
          setTeachersList(assignableStaff);
        } catch (error) {
          console.error("Failed to fetch teachers/admins:", error);
          toast({ title: "Error", description: "Could not load teacher information.", variant: "destructive" });
        }
      };
      fetchTeachers();
    } else {
      setTeachersList([]);
    }
  }, [selectedRole, toast, isClient]);

  useEffect(() => {
    if (selectedRole === 'admin' && isClient) {
      toast({
        title: "Admin Registration",
        description: "Note: Admin registration through this public form is typically disabled for security. This option is enabled for setup.",
        variant: "default",
        duration: 7000,
      });
    }
  }, [selectedRole, toast, isClient]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    // The AuthContext.register function will now handle the toast for admin registration attempt if it's disallowed there.
    // However, with the form change, it *will* allow admin registration if selected.

    const success = await register(values.name, values.email, values.password, values.role as Role, values.prn);
    setIsLoading(false);
    if (success) {
      toast({ title: "Registration Successful", description: "Welcome to CampusMarks!" });
      if (values.role === "teacher") {
        router.push("/teacher/dashboard");
      } else if (values.role === "student") {
        router.push("/student/dashboard");
      } else if (values.role === "admin") {
        router.push("/admin/dashboard");
      }
    } else {
      // Toast for failure is handled by AuthContext or createUser
    }
  }

  if (!isClient) {
    return (
      <div className="text-center p-6">
        <p className="text-lg text-muted-foreground">Loading form...</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-center text-3xl font-semibold tracking-tight text-foreground">
        Create an Account
      </h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground/80">Full Name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="John Doe" {...field} className="pl-10" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground/80">Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="you@example.com" {...field} className="pl-10" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground/80">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="password" placeholder="••••••••" {...field} className="pl-10" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-foreground/80">I want to register as a...</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== 'student') {
                            form.setValue('prn', ''); // Clear PRN if not student
                        }
                    }}
                    defaultValue={field.value}
                    className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4"
                  >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="student" id="reg-role-student"/>
                      </FormControl>
                      <FormLabel htmlFor="reg-role-student" className="font-normal text-foreground/90">Student</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="teacher" id="reg-role-teacher"/>
                      </FormControl>
                      <FormLabel htmlFor="reg-role-teacher" className="font-normal text-foreground/90">Teacher</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="admin" id="reg-role-admin"/>
                      </FormControl>
                      <FormLabel htmlFor="reg-role-admin" className="font-normal text-foreground/90">Admin</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {selectedRole === "student" && (
            <>
              <FormField
                control={form.control}
                name="prn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">PRN (Student ID)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Info className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="e.g., PRN001" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {teachersList.length > 0 && (
                <Card className="mt-4 border-accent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-accent">
                      <BookUser className="h-5 w-5" />
                      Available Teachers &amp; Admins
                    </CardTitle>
                    <CardDescription>
                      Here are the teaching staff at CampusMarks.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-40">
                      <ul className="space-y-2">
                        {teachersList.map(teacher => (
                          <li key={teacher.id} className="p-2 border-b text-sm">
                            <p className="font-semibold">{teacher.name} <span className="text-xs text-muted-foreground">({teacher.role})</span></p>
                            {teacher.subjects && teacher.subjects.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                General Subjects: {teacher.subjects.join(', ')}
                              </p>
                            )}
                            {teacher.semesterAssignments && teacher.semesterAssignments.length > 0 && (
                               <p className="text-xs text-muted-foreground">
                                Semester Subjects: {teacher.semesterAssignments.map(sa => `${sa.semester}: ${sa.subjects.join(', ')}`).join('; ')}
                               </p>
                            )}
                             {(!teacher.subjects || teacher.subjects.length === 0) && (!teacher.semesterAssignments || teacher.semesterAssignments.length === 0) && (
                                <p className="text-xs text-muted-foreground">No specific subjects listed.</p>
                             )}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </>
          )}
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={isLoading || (!isClient && selectedRole === 'admin')}
          >
            {(!isClient && selectedRole === 'admin') ? "Loading..." : (isLoading ? "Creating Account..." : "Create Account")}
          </Button>
        </form>
      </Form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign In
        </Link>
      </p>
    </>
  );
}

    