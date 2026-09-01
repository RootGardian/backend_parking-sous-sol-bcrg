
const fs = require('fs');

let authCtrl = fs.readFileSync('src/controllers/auth.controller.ts', 'utf8');

// 1. Add doit_changer_mdp to JWT payload
if (!authCtrl.includes('doit_changer_mdp: utilisateur.doit_changer_mdp')) {
  authCtrl = authCtrl.replace('matricule: utilisateur.matricule', 'matricule: utilisateur.matricule,\n      doit_changer_mdp: utilisateur.doit_changer_mdp');
}

// 2. Add changePassword route
const changePwdFn = \

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const { nouveau_mot_de_passe } = req.body;
  if (!nouveau_mot_de_passe) {
    throw new AppError('Le nouveau mot de passe est obligatoire.', 400);
  }

  // @ts-ignore
  const id_utilisateur = req.user.id_utilisateur;

  const hashedPassword = await bcrypt.hash(nouveau_mot_de_passe + PEPPER, 10);

  await db.orm.public.Utilisateur.where({ id: id_utilisateur }).update({
    mot_de_passe: hashedPassword,
    doit_changer_mdp: false
  });

  res.json({ message: 'Mot de passe mis à jour avec succès. Veuillez vous reconnecter avec votre nouveau mot de passe.' });
};
\;

if (!authCtrl.includes('export const changePassword')) {
  authCtrl = authCtrl + changePwdFn;
}

fs.writeFileSync('src/controllers/auth.controller.ts', authCtrl);

let authRoutes = fs.readFileSync('src/routes/auth.routes.ts', 'utf8');
if (!authRoutes.includes('changePassword')) {
  authRoutes = authRoutes.replace('import { login, me } from \\'../controllers/auth.controller\\';', 'import { login, me, changePassword } from \\'../controllers/auth.controller\\';');
  authRoutes = authRoutes.replace('export default router;', 'router.post(\\'/change-password\\', [verifyToken], changePassword);\\n\\nexport default router;');
  fs.writeFileSync('src/routes/auth.routes.ts', authRoutes);
}

let middleware = fs.readFileSync('src/middlewares/auth.middleware.ts', 'utf8');
if (!middleware.includes('doit_changer_mdp')) {
  middleware = middleware.replace(
    'req.user = decoded;',
    \eq.user = decoded;
    
    // Si l'utilisateur doit changer de mot de passe, bloquer toutes les requêtes sauf /change-password
    if (decoded.doit_changer_mdp && !req.path.includes('/change-password')) {
      res.status(403).json({
        message: 'Vous devez réinitialiser votre mot de passe pour continuer.',
        requires_password_change: true
      });
      return;
    }\
  );
  fs.writeFileSync('src/middlewares/auth.middleware.ts', middleware);
}

let adminCtrl = fs.readFileSync('src/controllers/admin.controller.ts', 'utf8');
if (!adminCtrl.includes('doit_changer_mdp: true')) {
  // Replace mot_de_passe: hashedPassword with mot_de_passe: hashedPassword, doit_changer_mdp: true in ajouterUtilisateur / import
  adminCtrl = adminCtrl.replace(/mot_de_passe: hashedPassword,/g, 'mot_de_passe: hashedPassword,\\n          doit_changer_mdp: true,');
  fs.writeFileSync('src/controllers/admin.controller.ts', adminCtrl);
}

