const bcrypt = require("bcryptjs");
// Hasher un mot de passe (lors de l'inscription)
const hash = await bcrypt.hash(motDePasse, 10);
// Vérifier un mot de passe (lors de la connexion)
const ok = await bcrypt.compare(motDePasseSaisi, hashEnBase);
