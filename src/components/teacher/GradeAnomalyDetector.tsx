"use client";

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { GradeAnomalyInput } from '@/types';
import { detectGradeAnomalies, DetectGradeAnomaliesOutput } from '@/ai/flows/detect-grade-anomalies';
import { AlertTriangle, CheckCircle2, Lightbulb, Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const anomalySchema = z.object({
  studentName: z.string().min(1, "Student name is required."),
  prnNumber: z.string().min(1, "PRN number is required."),
  subjectName: z.string().min(1, "Subject name is required."),
  grade: z.coerce.number().min(0, "Grade must be non-negative."),
  maxGrade: z.coerce.number().min(1, "Max grade must be at least 1."),
}).refine(data => data.grade <= data.maxGrade, {
  message: "Grade cannot exceed max grade.",
  path: ["grade"],
});

type AnomalyFormData = z.infer<typeof anomalySchema>;

export function GradeAnomalyDetector() {
  const [isLoading, setIsLoading] = useState(false);
  const [anomalyResult, setAnomalyResult] = useState<DetectGradeAnomaliesOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<AnomalyFormData>({
    resolver: zodResolver(anomalySchema),
    defaultValues: {
      studentName: '',
      prnNumber: '',
      subjectName: '',
      grade: 0,
      maxGrade: 100,
    },
  });

  const onSubmit = async (data: AnomalyFormData) => {
    setIsLoading(true);
    setAnomalyResult(null);
    try {
      const input: GradeAnomalyInput = data;
      const result = await detectGradeAnomalies(input);
      setAnomalyResult(result);
      toast({
        title: "Anomaly Check Complete",
        description: result.isAnomalous ? "Anomaly detected." : "No anomaly detected.",
      });
    } catch (error) {
      console.error("Anomaly detection error:", error);
      toast({
        title: "Error Detecting Anomaly",
        description: "Could not perform anomaly detection. Please try again.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center">
          <Lightbulb className="mr-2 h-6 w-6 text-accent" />
          AI Grade Anomaly Detector
        </CardTitle>
        <CardDescription>
          Enter student grade details to check for potential anomalies using AI.
          The AI considers out-of-bounds grades or significant deviations from expected performance.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="studentName"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="studentName">Student Name</Label>
                    <FormControl>
                      <Input id="studentName" placeholder="e.g., Alice Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prnNumber"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="prnNumber">PRN Number</Label>
                    <FormControl>
                     <Input id="prnNumber" placeholder="e.g., PRN001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="subjectName"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="subjectName">Subject Name</Label>
                    <FormControl>
                     <Input id="subjectName" placeholder="e.g., Advanced Physics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="grade">Grade Obtained</Label>
                    <FormControl>
                      <Input id="grade" type="number" placeholder="e.g., 85" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxGrade"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="maxGrade">Maximum Grade</Label>
                    <FormControl>
                      <Input id="maxGrade" type="number" placeholder="e.g., 100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="mr-2 h-4 w-4" />
              )}
              Detect Anomalies
            </Button>

            {anomalyResult && (
              <Alert variant={anomalyResult.isAnomalous ? "destructive" : "default"} className="mt-6">
                {anomalyResult.isAnomalous ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5 text-green-600" />}
                <AlertTitle className="text-lg">
                  {anomalyResult.isAnomalous ? "Anomaly Detected!" : "No Anomaly Detected"}
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{anomalyResult.explanation}</p>
                  {anomalyResult.isAnomalous && anomalyResult.suggestedGrade !== undefined && (
                    <p className="font-semibold">
                      Suggested Corrected Grade: <span className="text-accent">{anomalyResult.suggestedGrade}</span>
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
