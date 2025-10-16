import { PrismaClient } from '../generated/prisma/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt';
import {RoleInput, signinInput,signupInput} from '@anshpujara/crowd-management_common';
import * as bcrypt from 'bcryptjs';

type Role = 'student' | 'security' | 'driver';

function isRole(x: unknown): x is Role {
  return x === 'student' || x === 'security' || x === 'driver';
}

export const userRouter = new Hono<{
    Bindings:{
        DATABASE_URL:string,
        JWT_SECRET:string,
    },
    Variables:{
        userId:string,
        role:Role
        name:string
    }
}>();

userRouter.post('/signup',async(c)=>{
    console.log("signup entered");
    console.log(c.env.DATABASE_URL);
    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const {success} = signupInput.safeParse(body);
    const passwordHash = bcrypt.hashSync(body.password, 10);

    if(!success){
        c.status(400);
        return c.json({error:"Invalid inputs"});
    }

    try{
        const user = await prisma.user.create({
            data:{    
                email:body.email,
                password:passwordHash,
                role:body.role,
                name:body.name
            }
        });
        const jwt = await sign({id:user.id,role:user.role,name:user.name},c.env.JWT_SECRET);
        console.log(jwt);
        return c.json({jwt});
    }catch(e){
        console.log(e);
        c.status(403);
        return c.json({
            error:"Error while signing up"
        })
    }
})

userRouter.post('/signin',async (c)=>{
    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const {success} = signinInput.safeParse(body);

    if(!success){
        c.status(400);
        return c.json({error:"Invalid inputs"});
    }

    try{
        const user = await prisma.user.findUnique({
            where:{
                email:body.email
            },
            select:{
                id:true,
                role:true,
                password:true,
                name:true
            }
        });
        if(!user){
            c.status(403);
            return c.json({message : "User not found"});
        }

        const ok = bcrypt.compareSync(body.password,user.password);

        if(!ok){
            c.status(403);
            return c.json({message : "Invalid Credentials"});
        }

        const jwt = await sign({id:user.id,role:user.role,name:user.name},c.env.JWT_SECRET);
        return c.json({jwt});
    }catch(e){
        console.log(e);
        c.status(403);
        return c.json({error:"Error while singing in"})
    }
})

userRouter.get('/debug/db',(c)=>{
    const url = c.env.DATABASE_URL
    return c.json({
        usingPrismaSchema:url.startsWith('prisma://'),
        preview:url.slice(0,40) + "..."
    })
})

userRouter.get('/debug/accelerate', (c) => {
  const url = c.env.DATABASE_URL || '';
  const hasApiKey = /api_key=([^&]+)/.test(url);
  const keyLen = (() => {
    const m = url.match(/api_key=([^&]+)/);
    return m ? m[1].length : 0;
  })();
  return c.json({
    startsWithPrisma: url.startsWith('prisma://'),
    hasApiKey,
    keyLength: keyLen,       // typical keys are long (dozens of chars)
    preview: url.slice(0, 40) + '…'
  });
});

userRouter.get('/health', c => c.json({ ok: true, t: Date.now() }))

userRouter.use(async(c,next)=>{
    const jwt = c.req.header("Authorization");

    if(!jwt){
        c.status(401);
        return c.text("unAuthorization")
    }

    const token = jwt.split(" ")[1];
    try{    
        const payload = await verify(token,c.env.JWT_SECRET);

        if(!payload){
            c.status(401);
            return c.text("unAuthorization")
        }

        c.set('userId',String(payload.id));
        c.set('name', typeof payload.name === 'string' ? payload.name : 'Anonymous');
        const rawRole = (payload as any)?.role;
        if(isRole(rawRole)){
            c.set('role',rawRole);
        }
        else{
            c.status(401);
            return c.text("unAuthorization")
        }
        await next();
    }catch(e){
        c.status(401);
        return c.text("unAuthorization")
    }
})

userRouter.get('/me',async(c)=>{
    const userId=c.get('userId') as string | undefined;
    // const name=c.get('name');
    // const role=c.get('role');
    // console.log(name);
    console.log(userId);
    // console.log(role);

    if(!userId){
        c.status(403)
        return c.json({error:"Id not found"});
    }

    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate());

    try{
        const UserInformation = await prisma.user.findUnique({
            where:{
                id:userId
            },
            select:{
                id:true,
                email:true,
                name:true,
                role:true
            }
        })

        if (!UserInformation) return c.text('Not found', 404);

        return c.json(UserInformation);

    }
    catch(e){
        c.status(403);
        console.log(e);
        return c.json({error:"Error while getting user information"})
    }
})

userRouter.post('/role', async (c) => {
    console.log("Role entered")

    const userId = c.get('userId') as string | undefined;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json().catch(() => ({}));
    const parsed = RoleInput.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Invalid role' }, 400);

    const prisma = new PrismaClient({ datasourceUrl: c.env.DATABASE_URL }).$extends(withAccelerate());
    const updated = await prisma.user.update({
        where: { id: userId },
        data: { role: parsed.data.role }, // "student" | "security" | "driver"
        select: { id: true, role: true }
    });

    return c.json({ ok: true, user: updated });
});
