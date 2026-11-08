import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/misc';
import { useAuthStore } from '@/stores/authStore';
import { isDemoMode, isFirebaseConfigured } from '@/config/firebase';

const schema = z.object({
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const user = useAuthStore((s) => s.user);
  const { signIn, register: registerUser, signInGoogle, signInDemo } = useAuthStore();
  const [mode, setMode] = React.useState<'login' | 'register'>('login');
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  if (user) return <Navigate to={from} replace />;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    const err = mode === 'login' ? await signIn(email, password) : await registerUser(email, password);
    if (err) setError(err);
    else navigate(from, { replace: true });
  });

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-primary/10 via-background to-accent/40 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow">
            <Clapperboard className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">AI Video Prompt Studio</h1>
          <p className="text-sm text-muted-foreground">Brief produk menjadi paket produksi video promosi.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{mode === 'login' ? 'Masuk' : 'Daftar akun'}</CardTitle>
            <CardDescription>
              {isDemoMode ? 'Mode Demo Lokal aktif — tanpa Firebase.' : 'Gunakan email dan password Anda.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDemoMode ? (
              <>
                <Alert variant="warning" title="Mode Demo Lokal">
                  {isFirebaseConfigured
                    ? 'VITE_DEMO_MODE=true.'
                    : 'Konfigurasi Firebase belum diisi (.env.local).'}{' '}
                  Data project disimpan hanya di browser ini, tidak sinkron online.
                </Alert>
                <Button className="w-full" onClick={() => void signInDemo().then(() => navigate(from, { replace: true }))}>
                  Masuk ke Mode Demo
                </Button>
              </>
            ) : (
              <>
                <form onSubmit={onSubmit} className="space-y-3" noValidate>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!formState.errors.email} />
                    {formState.errors.email && <p className="text-xs text-destructive">{formState.errors.email.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      {...register('password')}
                      aria-invalid={!!formState.errors.password}
                    />
                    {formState.errors.password && <p className="text-xs text-destructive">{formState.errors.password.message}</p>}
                  </div>
                  {error && (
                    <p className="text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  )}
                  <Button type="submit" className="w-full" loading={formState.isSubmitting}>
                    {mode === 'login' ? 'Masuk' : 'Daftar'}
                  </Button>
                </form>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    const err = await signInGoogle();
                    if (err) setError(err);
                  }}
                >
                  Masuk dengan Google
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
                  <button type="button" className="text-primary underline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                    {mode === 'login' ? 'Daftar' : 'Masuk'}
                  </button>
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Aplikasi pribadi. API key Gemini tidak pernah dikirim ke server aplikasi.
        </p>
      </div>
    </div>
  );
}
