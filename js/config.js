/* ========================================
   Frota Noronha — Configuração
   ========================================
   Credenciais de conexão com o Supabase.

   O publishable key (anon key) é seguro para ficar no
   código do navegador — a segurança real vem do RLS
   no banco de dados.
   ======================================== */

const CONFIG = {
  SUPABASE_URL: 'https://zbbhwsvwdzcotxmlffqt.supabase.co',
  SUPABASE_KEY: 'sb_publishable_R1693GYP5nroiSwFjHB90Q_IVFWs-KF'
};

// Disponibiliza globalmente
window.CONFIG = CONFIG;
