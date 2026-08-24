import 'next-auth';
import { Role } from '@prisma/client';

declare module 'next-auth' {
  interface User {
    id: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
  }
}