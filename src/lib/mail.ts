import nodemailer from 'nodemailer'
import { env } from '../env.ts'

export async function getMailClient() {
    const transporter = nodemailer.createTransport({
        host: env.BREVO_SMTP_HOST,
        port: env.BREVO_SMTP_PORT,
        secure: false,
        auth: {
            user: env.BREVO_SMTP_USER,
            pass: env.BREVO_SMTP_PASSWORD,
        },
    })

    return transporter
}