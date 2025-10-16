import nodemailer from 'nodemailer'

export async function getMailClient() {
    const account = await nodemailer.createTestAccount()

    const transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: account.user,
            pass: account.pass,
        },
    })

    return transporter
}