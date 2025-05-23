
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, KeyRound, User as UserIcon, Info, Users, BookUser } from "lucide-react"; // Renamed User to UserIcon
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
import type { Role, User } from "@/types"; // Added User type
import { useToast } from "@/hooks/use-toast";
import { getAllTeachers } from "@/lib/mockData"; // Import getAllTeachers
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["student", "teacher", "admin"], { required_error: "You must select a role." }), // Added admin for schema consistency
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
  const [teachersList, setTeachersList] = useState<User[]>([]); // State for teachers list

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
    if (selectedRole === 'student') {
      const fetchTeachers = async () => {
        try {
          const teachers = await getAllTeachers();
          setTeachersList(teachers);
        } catch (error) {
          console.error("Failed to fetch teachers:", error);
          toast({ title: "Error", description: "Could not load teacher information.", variant: "destructive" });
        }
      };
      fetchTeachers();
    } else {
      setTeachersList([]); // Clear list if not student
    }
  }, [selectedRole, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    // Admins should not be registered through this public form.
    if (values.role === 'admin') {
        toast({ title: "Registration Info", description: "Admin registration is not allowed through this form.", variant: "default" });
        setIsLoading(false);
        return;
    }

    // Normalize PRN to uppercase if role is student
    const studentPrn = values.role === 'student' && values.prn 
                       ? values.prn.trim().toUpperCase() 
                       : values.prn;

    const success = await register(values.name, values.email, values.password, values.role as Role, studentPrn);
    setIsLoading(false);
    if (success) {
      toast({ title: "Registration Successful", description: "Welcome to CampusMarks!" });
      if (values.role === "teacher") {
        router.push("/teacher/dashboard");
      } else if (values.role === "student") {
        // For students, navigate to their dashboard which might redirect to marks page or PRN entry
        router.push("/student/dashboard");
      }
      // Admin redirect won't be hit from UI due to above check
    } else {
      toast({
        title: "Registration Failed",
        description: "User might already exist or an error occurred. Please try again.",
        variant: "destructive",
      });
    }
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
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-4"
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
                      Available Teachers
                    </CardTitle>
                    <CardDescription>
                      Here are the teachers at CampusMarks.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-40">
                      <ul className="space-y-2">
                        {teachersList.map(teacher => (
                          <li key={teacher.id} className="p-2 border-b text-sm">
                            <p className="font-semibold">{teacher.name}</p>
                            {teacher.subjects && teacher.subjects.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Teaches: {teacher.subjects.join(', ')}
                              </p>
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
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Create Account"}
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

