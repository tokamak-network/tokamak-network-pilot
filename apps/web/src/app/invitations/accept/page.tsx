'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAtom } from 'jotai';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  FolderKanban,
  Mail,
  Clock,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import {
  fetchInvitationByToken,
  acceptInvitation,
  type InvitationDetailResponse,
} from '@/lib/api';
import { userAtom } from '@/store/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type PageState =
  | 'loading'
  | 'preview'
  | 'accepting'
  | 'accepted'
  | 'error'
  | 'needs-login';

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [user] = useAtom(userAtom);

  const [state, setState] = useState<PageState>('loading');
  const [invitation, setInvitation] = useState<InvitationDetailResponse | null>(null);
  const [error, setError] = useState('');
  const [acceptResult, setAcceptResult] = useState<{
    projectSlug: string;
    projectName: string;
    role?: string;
  } | null>(null);

  const loadInvitation = useCallback(async () => {
    if (!token) {
      setError('No invitation token provided');
      setState('error');
      return;
    }

    try {
      const data = await fetchInvitationByToken(token);
      setInvitation(data);

      if (data.status !== 'pending') {
        setError(`This invitation has already been ${data.status}.`);
        setState('error');
        return;
      }

      if (new Date(data.expiresAt) < new Date()) {
        setError('This invitation has expired.');
        setState('error');
        return;
      }

      if (!user) {
        setState('needs-login');
      } else {
        setState('preview');
      }
    } catch (err: any) {
      setError(err.message || 'Invitation not found');
      setState('error');
    }
  }, [token, user]);

  useEffect(() => {
    loadInvitation();
  }, [loadInvitation]);

  const handleAccept = async () => {
    if (!token) return;
    setState('accepting');
    try {
      const result = await acceptInvitation(token);
      setAcceptResult({
        projectSlug: result.projectSlug,
        projectName: result.projectName,
        role: result.role,
      });
      setState('accepted');
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
      setState('error');
    }
  };

  const loginUrl = `/login?next=${encodeURIComponent(`/invitations/accept?token=${token}`)}`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Tokamak Forest</h1>
          <p className="text-sm text-muted-foreground mt-1">Project Invitation</p>
        </div>

        {/* Loading */}
        {state === 'loading' && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading invitation...</p>
            </CardContent>
          </Card>
        )}

        {/* Needs Login */}
        {state === 'needs-login' && invitation && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto size-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                <Mail className="size-6 text-primary" />
              </div>
              <CardTitle>Sign In to Accept</CardTitle>
              <CardDescription>
                You need to sign in to accept this invitation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {invitation.project.logoUrl ? (
                    <img src={invitation.project.logoUrl} alt="" className="size-8 rounded-lg object-cover" />
                  ) : (
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FolderKanban className="size-4 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{invitation.project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited as <span className="font-medium capitalize">{invitation.role}</span>
                    </p>
                  </div>
                </div>
                {invitation.project.description && (
                  <p className="text-xs text-muted-foreground">{invitation.project.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Invited by {invitation.invitedBy.name || invitation.invitedBy.email}
                </p>
              </div>

              <Link href={loginUrl} className="block">
                <Button className="w-full" size="lg">
                  <LogIn className="size-4" />
                  Sign In & Accept
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Preview (logged in, ready to accept) */}
        {state === 'preview' && invitation && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto size-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                <Mail className="size-6 text-primary" />
              </div>
              <CardTitle>You&apos;re Invited!</CardTitle>
              <CardDescription>
                You&apos;ve been invited to join a project on Tokamak Forest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {invitation.project.logoUrl ? (
                    <img src={invitation.project.logoUrl} alt="" className="size-10 rounded-lg object-cover" />
                  ) : (
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FolderKanban className="size-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{invitation.project.name}</p>
                    <p className="text-xs text-muted-foreground">/{invitation.project.slug}</p>
                  </div>
                </div>
                {invitation.project.description && (
                  <p className="text-sm text-muted-foreground">{invitation.project.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Your role</span>
                  <span className="font-medium capitalize">{invitation.role}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Invited by</span>
                  <span className="font-medium">
                    {invitation.invitedBy.name || invitation.invitedBy.email}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" /> Expires
                  </span>
                  <span className="font-medium">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleAccept}>
                <CheckCircle2 className="size-4" />
                Accept Invitation
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Accepting */}
        {state === 'accepting' && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="size-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Joining the project...</p>
            </CardContent>
          </Card>
        )}

        {/* Accepted */}
        {state === 'accepted' && acceptResult && (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <div className="mx-auto size-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="size-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Welcome aboard!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  You&apos;ve joined <strong>{acceptResult.projectName}</strong>
                  {acceptResult.role && <> as a <strong className="capitalize">{acceptResult.role}</strong></>}.
                </p>
              </div>
              <Link href={`/projects/${acceptResult.projectSlug}`}>
                <Button size="lg">
                  Go to Project
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {state === 'error' && (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <div className="mx-auto size-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="size-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Something went wrong</h2>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <div className="flex gap-2 justify-center">
                <Link href="/projects">
                  <Button variant="outline">Browse Projects</Button>
                </Link>
                <Link href="/">
                  <Button>Go Home</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
