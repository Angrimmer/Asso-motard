const nodemailer = require("nodemailer");

// Configuration du transporteur SMTP
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: false, // true si port 465, false pour 587
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Envoi de l'email d'activation
async function sendActivationEmail(email, display_name, token) {
  const lien = `${process.env.FRONTEND_URL}/definir-mot-de-passe.html?token=${token}`;

  await transporter.sendMail({
    from: `"Les Fêlés du Bocal" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Bienvenue ! Activez votre compte",
    html: `
      <h2>Bonjour ${display_name} !</h2>
      <p>Un compte membre a été créé pour vous sur le site des Fêlés du Bocal.</p>
      <p>Cliquez sur le lien ci-dessous pour définir votre mot de passe :</p>
      <a href="${lien}" style="
        display: inline-block;
        padding: 12px 24px;
        background-color: #e63946;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
      ">Activer mon compte</a>
      <p><small>Ce lien expire dans 48 heures.</small></p>
      <p><small>Si vous n'attendiez pas cet email, ignorez-le.</small></p>
    `,
  });
}

module.exports = { sendActivationEmail };
