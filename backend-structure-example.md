# Backend Structure para DigitalOcean

## Stack Sugerida
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js ou Fastify
- **ORM**: Prisma (recomendado) ou TypeORM
- **Auth**: JWT + bcrypt
- **Validation**: Zod
- **File Upload**: Multer + DigitalOcean Spaces

## Estrutura de Pastas
```
backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── clinicas.controller.ts
│   │   ├── users.controller.ts
│   │   └── prontuarios.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── rbac.middleware.ts
│   │   └── validation.middleware.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── email.service.ts
│   │   └── upload.service.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── clinicas.routes.ts
│   │   └── index.ts
│   ├── models/
│   │   └── (Prisma generated)
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── encryption.ts
│   │   └── validators.ts
│   └── app.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docker/
│   └── Dockerfile
└── package.json
```

## Exemplo de Controller
```typescript
// controllers/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginSchema, RegisterSchema } from '../utils/validators';

export class AuthController {
  private authService = new AuthService();

  async login(req: Request, res: Response) {
    try {
      const { email, password } = LoginSchema.parse(req.body);
      const result = await this.authService.login(email, password);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async register(req: Request, res: Response) {
    // Implementation
  }
}
```

## Exemplo de Service
```typescript
// services/auth.service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

export class AuthService {
  private prisma = new PrismaClient();

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true, roles: true }
    });

    if (!user || !await bcrypt.compare(password, user.password)) {
      throw new Error('Credenciais inválidas');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
        roles: user.roles
      },
      token
    };
  }
}
```