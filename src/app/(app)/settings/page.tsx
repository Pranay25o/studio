import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cog } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cog className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">Settings</CardTitle>
          </div>
          <CardDescription>Manage your application settings and preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This is a placeholder for application settings. More features will be added soon.</p>
          <div className="mt-6 space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold">Theme Settings</h3>
              <p className="text-sm text-muted-foreground">Dark mode/Light mode toggle (coming soon).</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold">Notification Preferences</h3>
              <p className="text-sm text-muted-foreground">Manage how you receive notifications (coming soon).</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold">Account Security</h3>
              <p className="text-sm text-muted-foreground">Change password or manage 2FA (coming soon).</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
