import { Hono } from 'hono'
import {signinInput,signupInput} from '@anshpujara/crowd-management_common';
import * as bcrypt from 'bcryptjs';
import { withPrisma } from "../db/prisma";
import { AppEnv, getJwtSecret, isRole, misconfigured, requireAuth, signToken } from '../auth';

export const userRouter = new Hono<AppEnv>();

userRouter.post('/signup',withPrisma,async(c)=>{
    const secret = getJwtSecret(c.env);
    if(!secret) return misconfigured(c);

    const body = await c.req.json();
    const {success} = signupInput.safeParse(body);
    const passwordHash = bcrypt.hashSync(body.password, 10);

    if(!success || !isRole(body.role)){
        c.status(400);
        return c.json({error:"Invalid inputs"});
    }

    try{
        const user = await c.var.prisma.user.create({
            data:{
                email:body.email,
                password:passwordHash,
                role:body.role,
                name:body.name
            }
        });
        const jwt = await signToken(user,secret);
        return c.json({jwt});
    }catch(e){
        console.log(e);
        c.status(403);
        return c.json({
            error:"Error while signing up"
        })
    }
})

userRouter.post('/signin',withPrisma,async (c)=>{
    const secret = getJwtSecret(c.env);
    if(!secret) return misconfigured(c);

    const body = await c.req.json();
    const {success} = signinInput.safeParse(body);

    if(!success){
        c.status(400);
        return c.json({error:"Invalid inputs"});
    }

    try{
        const user = await c.var.prisma.user.findUnique({
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
        // Same response for unknown email and wrong password, so accounts can't be enumerated.
        if(!user || !bcrypt.compareSync(body.password,user.password)){
            c.status(403);
            return c.json({message : "Invalid Credentials"});
        }

        const jwt = await signToken(user,secret);
        return c.json({jwt});
    }catch(e){
        console.log(e);
        c.status(403);
        return c.json({error:"Error while singing in"})
    }
})

userRouter.get('/health', c => c.json({ ok: true, t: Date.now() }))

userRouter.use(requireAuth)

userRouter.get('/me',withPrisma,async(c)=>{
    const userId=c.get('userId') as string | undefined;

    if(!userId){
        c.status(403)
        return c.json({error:"Id not found"});
    }

    try{
        const UserInformation = await c.var.prisma.user.findUnique({
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
