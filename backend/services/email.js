const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function enviarCorreoRecuperacion(destinatario, nombre, token) {
  const enlace = `${process.env.FRONTEND_URL}/restablecer/${token}`;

  await transporter.sendMail({
    from: `"MotoPreview" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: 'Restablece tu contraseña — MotoPreview',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0F2A3D;">Hola, ${nombre}</h2>
        <p style="color: #1C2B2E;">Recibimos una solicitud para restablecer tu contraseña en MotoPreview.</p>
        <p style="margin: 24px 0;">
          <a href="${enlace}" style="background: #0E6E6E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Restablecer contraseña
          </a>
        </p>
        <p style="color: #5B6B6A; font-size: 13px;">Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.</p>
      </div>
    `,
  });
}const MENSAJES_ESTADO = {
  aprobada: { titulo: '¡Tu cotización fue aprobada! 🎉', color: '#0E6E6E', texto: 'La tienda aprobó tu cotización. Pueden contactarte pronto para coordinar la entrega o instalación.' },
  rechazada: { titulo: 'Tu cotización fue rechazada', color: '#B3453D', texto: 'La tienda no pudo aprobar tu cotización esta vez. Puedes armar una nueva desde el catálogo si lo deseas.' },
  completada: { titulo: 'Tu cotización fue completada ✅', color: '#4A4FA8', texto: 'Tu pedido quedó marcado como completado. ¡Gracias por tu compra!' },
};

async function enviarCorreoCambioEstado(destinatario, nombre, coti_estado, total) {
  const info = MENSAJES_ESTADO[coti_estado];
  if (!info) return; // no notificamos "pendiente", solo cambios relevantes

  const totalFormateado = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(total);

  await transporter.sendMail({
    from: `"MotoPreview" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: `${info.titulo} — MotoPreview`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: ${info.color};">${info.titulo}</h2>
        <p style="color: #1C2B2E;">Hola, ${nombre}.</p>
        <p style="color: #1C2B2E;">${info.texto}</p>
        <p style="color: #5B6B6A; font-size: 14px;">Total de la cotización: <strong>${totalFormateado}</strong></p>
        <p style="margin: 24px 0;">
          <a href="${process.env.FRONTEND_URL}/mis-cotizaciones" style="background: #0F2A3D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Ver mis cotizaciones
          </a>
        </p>
      </div>
    `,
  });
}

async function enviarCorreoVerificacion(destinatario, nombre, token) {
  const enlace = `${process.env.FRONTEND_URL}/verificar/${token}`;

  await transporter.sendMail({
    from: `"MotoPreview" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: 'Confirma tu correo — MotoPreview',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0F2A3D;">¡Bienvenido, ${nombre}!</h2>
        <p style="color: #1C2B2E;">Gracias por registrarte en MotoPreview. Confirma tu correo para activar tu cuenta.</p>
        <p style="margin: 24px 0;">
          <a href="${enlace}" style="background: #0E6E6E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Confirmar mi correo
          </a>
        </p>
        <p style="color: #5B6B6A; font-size: 13px;">Si no creaste esta cuenta, ignora este correo.</p>
      </div>
    `,
  });
}

module.exports = { enviarCorreoRecuperacion, enviarCorreoCambioEstado, enviarCorreoVerificacion };