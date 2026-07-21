-- ============================================================
-- aff_db.sql — Africa Future Festival
-- Script SQL idempotent — création + données initiales
-- Style repris de nyuman.sql (audit columns, seeds ON CONFLICT,
-- IDs fixes INT4 pour les tables de référence, triggers plpgsql)
-- ============================================================

BEGIN;

-- ========================================
-- Bloc 0 — Identité, profils, RBAC granulaire
-- ========================================

CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL4 PRIMARY KEY,
    nom VARCHAR(255),
    prenom VARCHAR(255),
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    phone_numb VARCHAR(255),
    password VARCHAR(255),
    description VARCHAR(255),
    profile_picture_path VARCHAR(255),
    is_officiel BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_default_password BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by INT4,
    updated_by INT4,
    deleted_by INT4
);

-- INT4 fixe (pas SERIAL) : profils métier stables
CREATE TABLE IF NOT EXISTS profil (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(255),
    code VARCHAR(255),
    features_version INT4 DEFAULT 1,  -- incrémentée par trigger feature_profil
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by INT4,
    updated_by INT4,
    deleted_by INT4
);

CREATE TABLE IF NOT EXISTS user_profil (
    id SERIAL4 PRIMARY KEY,
    user_id INT4 REFERENCES "user"(id),
    profil_id INT4 REFERENCES profil(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by INT4,
    updated_by INT4,
    deleted_by INT4,
    UNIQUE(user_id, profil_id)
);

-- Arbre de permissions (parent_id NULL = catégorie racine)
CREATE TABLE IF NOT EXISTS feature (
    id SERIAL4 PRIMARY KEY,
    parent_id INT4 REFERENCES feature(id),
    libelle VARCHAR(255),
    code VARCHAR(255),
    description VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by INT4,
    updated_by INT4,
    deleted_by INT4
);

CREATE TABLE IF NOT EXISTS feature_profil (
    id SERIAL4 PRIMARY KEY,
    profil_id INT4 REFERENCES profil(id),
    feature_id INT4 REFERENCES feature(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by INT4,
    updated_by INT4,
    deleted_by INT4,
    UNIQUE(profil_id, feature_id)
);

-- ========================================
-- Bloc 1 — Édition annuelle (transversal)
-- ========================================

CREATE TABLE IF NOT EXISTS statut_edition (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(50),
    code VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS edition (
    id SERIAL4 PRIMARY KEY,
    annee INT4,
    nom VARCHAR(255),
    ville VARCHAR(255),
    lieu VARCHAR(255),
    date_debut DATE,
    date_fin DATE,
    candidature_deadline TIMESTAMP,
    ceremonie_date TIMESTAMP,
    statut_id INT4 REFERENCES statut_edition(id),
    created_by INT4 REFERENCES "user"(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- ========================================
-- Bloc 2 — Communauté + Feed (permanent, hors édition)
-- ========================================

CREATE TABLE IF NOT EXISTS communaute (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(255),
    code VARCHAR(255),
    description VARCHAR(255),
    couleur VARCHAR(50),
    icon_path VARCHAR(255),
    membres_count INT4 DEFAULT 0,
    publications_count INT4 DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by INT4,
    updated_by INT4,
    deleted_by INT4
);

CREATE TABLE IF NOT EXISTS user_communaute (
    id SERIAL4 PRIMARY KEY,
    user_id INT4 REFERENCES "user"(id),
    communaute_id INT4 REFERENCES communaute(id),
    joined_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, communaute_id)
);

CREATE TABLE IF NOT EXISTS statut_publication (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(50),
    code VARCHAR(255)
);

-- communaute_id NULLABLE : NULL = publication officielle diffusée
-- à tout le monde (voir trigger fn_publication_officiel_check)
CREATE TABLE IF NOT EXISTS publication (
    id SERIAL4 PRIMARY KEY,
    user_id INT4 REFERENCES "user"(id),
    communaute_id INT4 REFERENCES communaute(id),
    contenu TEXT,
    statut_id INT4 REFERENCES statut_publication(id),
    reactions_count INT4 DEFAULT 0,
    commentaires_count INT4 DEFAULT 0,
    partages_count INT4 DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by INT4,
    updated_by INT4,
    deleted_by INT4
);

CREATE TABLE IF NOT EXISTS reaction_type (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(50),
    emoji VARCHAR(10),
    code VARCHAR(255)
);

-- Un seul type de réaction actif par user/publication (comme Facebook :
-- changer de réaction remplace la précédente, ne l'additionne pas)
CREATE TABLE IF NOT EXISTS reaction (
    id SERIAL4 PRIMARY KEY,
    user_id INT4 REFERENCES "user"(id),
    publication_id INT4 REFERENCES publication(id),
    reaction_type_id INT4 REFERENCES reaction_type(id),
    created_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, publication_id)
);

CREATE TABLE IF NOT EXISTS publication_reaction_count (
    publication_id INT4 REFERENCES publication(id),
    reaction_type_id INT4 REFERENCES reaction_type(id),
    count INT4 DEFAULT 0,
    PRIMARY KEY (publication_id, reaction_type_id)
);

-- parent_commentaire_id NULL = commentaire de premier niveau.
-- Max 2 niveaux forcé par trigger fn_commentaire_depth_check.
CREATE TABLE IF NOT EXISTS commentaire (
    id SERIAL4 PRIMARY KEY,
    publication_id INT4 REFERENCES publication(id),
    user_id INT4 REFERENCES "user"(id),
    contenu TEXT,
    parent_commentaire_id INT4 REFERENCES commentaire(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by INT4,
    updated_by INT4,
    deleted_by INT4
);

CREATE TABLE IF NOT EXISTS hashtag (
    id SERIAL4 PRIMARY KEY,
    libelle VARCHAR(255) UNIQUE,
    publications_count INT4 DEFAULT 0,
    created_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS publication_hashtag (
    id SERIAL4 PRIMARY KEY,
    publication_id INT4 REFERENCES publication(id),
    hashtag_id INT4 REFERENCES hashtag(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(publication_id, hashtag_id)
);

-- ========================================
-- Bloc 3 — Modération (polymorphe + trigger d'intégrité)
-- ========================================

CREATE TABLE IF NOT EXISTS cible_type (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(50),
    code VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS severite (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(50),
    code VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS statut_signalement (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(50),
    code VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS signalement (
    id SERIAL4 PRIMARY KEY,
    cible_type_id INT4 REFERENCES cible_type(id),
    cible_id INT4,
    signale_par_user_id INT4 REFERENCES "user"(id),
    motif TEXT,
    severite_id INT4 REFERENCES severite(id),
    statut_id INT4 REFERENCES statut_signalement(id),
    resolu_par_user_id INT4 REFERENCES "user"(id),
    resolu_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- ========================================
-- Bloc 4 — Awards (par édition)
-- ========================================

CREATE TABLE IF NOT EXISTS award_theme (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(255),
    code VARCHAR(255),
    ordre INT4
);

CREATE TABLE IF NOT EXISTS award_category (
    id SERIAL4 PRIMARY KEY,
    edition_id INT4 REFERENCES edition(id),
    theme_id INT4 REFERENCES award_theme(id),
    libelle VARCHAR(255),
    code VARCHAR(255),
    description VARCHAR(255),
    is_grand_prix BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS statut_candidature (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(50),
    code VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS candidature (
    id SERIAL4 PRIMARY KEY,
    user_id INT4 REFERENCES "user"(id),
    categorie_id INT4 REFERENCES award_category(id),
    edition_id INT4 REFERENCES edition(id),
    description TEXT,
    portfolio_url VARCHAR(255),
    statut_id INT4 REFERENCES statut_candidature(id),
    submitted_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, categorie_id)
);

CREATE TABLE IF NOT EXISTS media_type (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(50),
    code VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS candidature_media (
    id SERIAL4 PRIMARY KEY,
    candidature_id INT4 REFERENCES candidature(id),
    media_type_id INT4 REFERENCES media_type(id),
    file_path VARCHAR(255),
    ordre INT4,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS jury_vote (
    id SERIAL4 PRIMARY KEY,
    candidature_id INT4 REFERENCES candidature(id),
    jury_user_id INT4 REFERENCES "user"(id),
    score INT4,
    commentaire TEXT,
    created_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(candidature_id, jury_user_id)
);

-- categorie_id dénormalisé depuis candidature (rempli par trigger)
-- pour permettre UNIQUE(user_id, categorie_id) : un seul vote public
-- par utilisateur et par catégorie, peu importe la candidature choisie.
CREATE TABLE IF NOT EXISTS vote_public (
    id SERIAL4 PRIMARY KEY,
    candidature_id INT4 REFERENCES candidature(id),
    categorie_id INT4 REFERENCES award_category(id),
    user_id INT4 REFERENCES "user"(id),
    voted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, categorie_id)
);

CREATE TABLE IF NOT EXISTS award_result (
    id SERIAL4 PRIMARY KEY,
    categorie_id INT4 REFERENCES award_category(id) UNIQUE,
    candidature_gagnante_id INT4 REFERENCES candidature(id),
    announced_at TIMESTAMP
);

-- ========================================
-- Bloc 5 — Programme + Masterclass (par édition)
-- ========================================

CREATE TABLE IF NOT EXISTS type_evenement (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(50),
    code VARCHAR(255)
);

-- NB : si le site du festival change de lieu physique d'une édition
-- à l'autre, envisager d'ajouter edition_id ici. Laissé global pour
-- l'instant (hypothèse : même site chaque année).
CREATE TABLE IF NOT EXISTS lieu (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(255),
    capacite INT4,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS programme_evenement (
    id SERIAL4 PRIMARY KEY,
    edition_id INT4 REFERENCES edition(id),
    type_evenement_id INT4 REFERENCES type_evenement(id),
    titre VARCHAR(255),
    description TEXT,
    jour DATE,
    heure_debut TIME,
    heure_fin TIME,
    lieu_id INT4 REFERENCES lieu(id),
    is_hot BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS mode_diffusion (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(50),
    code VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS statut_masterclass (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(50),
    code VARCHAR(255)
);

-- Extension 1-1 de programme_evenement (voir fn_masterclass_check_mode) :
-- le lieu physique reste sur programme_evenement.lieu_id, masterclass
-- ne porte que ce qui lui est spécifique.
CREATE TABLE IF NOT EXISTS masterclass (
    id SERIAL4 PRIMARY KEY,
    evenement_id INT4 UNIQUE REFERENCES programme_evenement(id),
    communaute_id INT4 REFERENCES communaute(id),
    mode_diffusion_id INT4 REFERENCES mode_diffusion(id),
    meeting_url VARCHAR(255),
    max_participants INT4,
    participants_count INT4 DEFAULT 0,
    statut_id INT4 REFERENCES statut_masterclass(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS masterclass_role (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(50),
    code VARCHAR(255)
);

-- UNIQUE(masterclass_id, user_id) : un user ne peut pas cumuler 2 rôles
-- sur la même session, mais PLUSIEURS users peuvent être Expert
-- (panel/table ronde) sur la même masterclass.
CREATE TABLE IF NOT EXISTS masterclass_inscription (
    id SERIAL4 PRIMARY KEY,
    masterclass_id INT4 REFERENCES masterclass(id),
    user_id INT4 REFERENCES "user"(id),
    role_id INT4 REFERENCES masterclass_role(id),
    inscrit_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(masterclass_id, user_id)
);

CREATE TABLE IF NOT EXISTS favori_programme (
    id SERIAL4 PRIMARY KEY,
    user_id INT4 REFERENCES "user"(id),
    evenement_id INT4 REFERENCES programme_evenement(id),
    created_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, evenement_id)
);

-- ========================================
-- Bloc 6 — Messagerie (conversations/participants ; les messages
-- eux-mêmes vivent dans MongoDB, pas ici — voir prompt aff-api)
-- ========================================

CREATE TABLE IF NOT EXISTS conversation_type (
    id INT4 PRIMARY KEY,
    libelle VARCHAR(50),
    code VARCHAR(255)
);

-- user1_id/user2_id uniquement pour type = DIRECT (normalisé user1_id < user2_id).
-- nom/description/is_canal_general/created_by uniquement pour type = GROUPE.
CREATE TABLE IF NOT EXISTS conversation (
    id SERIAL4 PRIMARY KEY,
    type_id INT4 REFERENCES conversation_type(id),
    user1_id INT4 REFERENCES "user"(id),
    user2_id INT4 REFERENCES "user"(id),
    nom VARCHAR(255),
    description VARCHAR(255),
    is_canal_general BOOLEAN DEFAULT FALSE,
    created_by INT4 REFERENCES "user"(id),
    created_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS conversation_participant (
    id SERIAL4 PRIMARY KEY,
    conversation_id INT4 REFERENCES conversation(id),
    user_id INT4 REFERENCES "user"(id),
    joined_at TIMESTAMP,
    dernier_lu_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(conversation_id, user_id)
);

-- ========================================
-- Index
-- ========================================

CREATE INDEX IF NOT EXISTS idx_publication_communaute ON publication (communaute_id);
CREATE INDEX IF NOT EXISTS idx_publication_user ON publication (user_id);
CREATE INDEX IF NOT EXISTS idx_commentaire_publication ON commentaire (publication_id);
CREATE INDEX IF NOT EXISTS idx_reaction_publication ON reaction (publication_id);
CREATE INDEX IF NOT EXISTS idx_signalement_cible ON signalement (cible_type_id, cible_id);
CREATE INDEX IF NOT EXISTS idx_candidature_edition ON candidature (edition_id);
CREATE INDEX IF NOT EXISTS idx_candidature_categorie ON candidature (categorie_id);
CREATE INDEX IF NOT EXISTS idx_programme_edition ON programme_evenement (edition_id);
CREATE INDEX IF NOT EXISTS idx_programme_jour ON programme_evenement (jour);
CREATE INDEX IF NOT EXISTS idx_masterclass_inscription_masterclass ON masterclass_inscription (masterclass_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participant_user ON conversation_participant (user_id);

-- Empêche 2 conversations directes en double entre les 2 mêmes users.
-- (1 = DIRECT, voir seed conversation_type plus bas)
CREATE UNIQUE INDEX IF NOT EXISTS ux_conversation_direct
    ON conversation (user1_id, user2_id) WHERE type_id = 1;

-- ========================================
-- Triggers — comptage par catégorie
-- ========================================

-- user_communaute -> communaute.membres_count
CREATE OR REPLACE FUNCTION fn_communaute_membres_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE communaute SET membres_count = membres_count + 1 WHERE id = NEW.communaute_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.is_deleted AND NOT OLD.is_deleted THEN
        UPDATE communaute SET membres_count = membres_count - 1 WHERE id = NEW.communaute_id;
    ELSIF TG_OP = 'UPDATE' AND NOT NEW.is_deleted AND OLD.is_deleted THEN
        UPDATE communaute SET membres_count = membres_count + 1 WHERE id = NEW.communaute_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_communaute_membres_count ON user_communaute;
CREATE TRIGGER trg_communaute_membres_count
    AFTER INSERT OR UPDATE OF is_deleted ON user_communaute
    FOR EACH ROW EXECUTE FUNCTION fn_communaute_membres_count();

-- publication -> communaute.publications_count (seulement si communaute_id NOT NULL)
CREATE OR REPLACE FUNCTION fn_communaute_publications_count() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.communaute_id IS NULL THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'INSERT' THEN
        UPDATE communaute SET publications_count = publications_count + 1 WHERE id = NEW.communaute_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.is_deleted AND NOT OLD.is_deleted THEN
        UPDATE communaute SET publications_count = publications_count - 1 WHERE id = NEW.communaute_id;
    ELSIF TG_OP = 'UPDATE' AND NOT NEW.is_deleted AND OLD.is_deleted THEN
        UPDATE communaute SET publications_count = publications_count + 1 WHERE id = NEW.communaute_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_communaute_publications_count ON publication;
CREATE TRIGGER trg_communaute_publications_count
    AFTER INSERT OR UPDATE OF is_deleted ON publication
    FOR EACH ROW EXECUTE FUNCTION fn_communaute_publications_count();

-- publication.communaute_id NULL réservé aux comptes officiels
CREATE OR REPLACE FUNCTION fn_publication_officiel_check() RETURNS TRIGGER AS $$
DECLARE
    v_is_officiel BOOLEAN;
BEGIN
    IF NEW.communaute_id IS NULL THEN
        SELECT is_officiel INTO v_is_officiel FROM "user" WHERE id = NEW.user_id;
        IF NOT COALESCE(v_is_officiel, FALSE) THEN
            RAISE EXCEPTION 'Seul un compte officiel peut publier sans communauté associée (user_id=%)', NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_publication_officiel_check ON publication;
CREATE TRIGGER trg_publication_officiel_check
    BEFORE INSERT ON publication
    FOR EACH ROW EXECUTE FUNCTION fn_publication_officiel_check();

-- reaction -> publication_reaction_count (upsert) + publication.reactions_count (total)
CREATE OR REPLACE FUNCTION fn_publication_reaction_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO publication_reaction_count (publication_id, reaction_type_id, count)
        VALUES (NEW.publication_id, NEW.reaction_type_id, 1)
        ON CONFLICT (publication_id, reaction_type_id)
        DO UPDATE SET count = publication_reaction_count.count + 1;
        UPDATE publication SET reactions_count = reactions_count + 1 WHERE id = NEW.publication_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.is_deleted AND NOT OLD.is_deleted THEN
        UPDATE publication_reaction_count SET count = count - 1
            WHERE publication_id = NEW.publication_id AND reaction_type_id = NEW.reaction_type_id;
        UPDATE publication SET reactions_count = reactions_count - 1 WHERE id = NEW.publication_id;
    ELSIF TG_OP = 'UPDATE' AND NOT NEW.is_deleted AND OLD.is_deleted THEN
        INSERT INTO publication_reaction_count (publication_id, reaction_type_id, count)
        VALUES (NEW.publication_id, NEW.reaction_type_id, 1)
        ON CONFLICT (publication_id, reaction_type_id)
        DO UPDATE SET count = publication_reaction_count.count + 1;
        UPDATE publication SET reactions_count = reactions_count + 1 WHERE id = NEW.publication_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_publication_reaction_count ON reaction;
CREATE TRIGGER trg_publication_reaction_count
    AFTER INSERT OR UPDATE OF is_deleted ON reaction
    FOR EACH ROW EXECUTE FUNCTION fn_publication_reaction_count();

-- commentaire -> max 2 niveaux de profondeur
CREATE OR REPLACE FUNCTION fn_commentaire_depth_check() RETURNS TRIGGER AS $$
DECLARE
    v_grandparent INT4;
BEGIN
    IF NEW.parent_commentaire_id IS NOT NULL THEN
        SELECT parent_commentaire_id INTO v_grandparent
        FROM commentaire WHERE id = NEW.parent_commentaire_id;
        IF v_grandparent IS NOT NULL THEN
            RAISE EXCEPTION 'Impossible de répondre à une réponse (2 niveaux max)';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_commentaire_depth_check ON commentaire;
CREATE TRIGGER trg_commentaire_depth_check
    BEFORE INSERT ON commentaire
    FOR EACH ROW EXECUTE FUNCTION fn_commentaire_depth_check();

-- commentaire -> publication.commentaires_count
CREATE OR REPLACE FUNCTION fn_commentaire_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE publication SET commentaires_count = commentaires_count + 1 WHERE id = NEW.publication_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.is_deleted AND NOT OLD.is_deleted THEN
        UPDATE publication SET commentaires_count = commentaires_count - 1 WHERE id = NEW.publication_id;
    ELSIF TG_OP = 'UPDATE' AND NOT NEW.is_deleted AND OLD.is_deleted THEN
        UPDATE publication SET commentaires_count = commentaires_count + 1 WHERE id = NEW.publication_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_commentaire_count ON commentaire;
CREATE TRIGGER trg_commentaire_count
    AFTER INSERT OR UPDATE OF is_deleted ON commentaire
    FOR EACH ROW EXECUTE FUNCTION fn_commentaire_count();

-- publication_hashtag -> hashtag.publications_count
CREATE OR REPLACE FUNCTION fn_hashtag_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE hashtag SET publications_count = publications_count + 1 WHERE id = NEW.hashtag_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.is_deleted AND NOT OLD.is_deleted THEN
        UPDATE hashtag SET publications_count = publications_count - 1 WHERE id = NEW.hashtag_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hashtag_count ON publication_hashtag;
CREATE TRIGGER trg_hashtag_count
    AFTER INSERT OR UPDATE OF is_deleted ON publication_hashtag
    FOR EACH ROW EXECUTE FUNCTION fn_hashtag_count();

-- ========================================
-- Triggers — intégrité (signalement polymorphe, masterclass, feature)
-- ========================================

-- signalement.cible_id doit exister dans la table correspondant à cible_type_id
-- (1=Publication, 2=Commentaire, 3=Utilisateur — voir seed cible_type)
CREATE OR REPLACE FUNCTION fn_signalement_check_cible() RETURNS TRIGGER AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    CASE NEW.cible_type_id
        WHEN 1 THEN
            SELECT EXISTS(SELECT 1 FROM publication WHERE id = NEW.cible_id) INTO v_exists;
        WHEN 2 THEN
            SELECT EXISTS(SELECT 1 FROM commentaire WHERE id = NEW.cible_id) INTO v_exists;
        WHEN 3 THEN
            SELECT EXISTS(SELECT 1 FROM "user" WHERE id = NEW.cible_id) INTO v_exists;
        ELSE
            v_exists := FALSE;
    END CASE;
    IF NOT v_exists THEN
        RAISE EXCEPTION 'Cible introuvable pour signalement (cible_type_id=%, cible_id=%)', NEW.cible_type_id, NEW.cible_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_signalement_check_cible ON signalement;
CREATE TRIGGER trg_signalement_check_cible
    BEFORE INSERT ON signalement
    FOR EACH ROW EXECUTE FUNCTION fn_signalement_check_cible();

-- masterclass : présentiel => lieu (via evenement) obligatoire, meeting_url interdit
--               distanciel => meeting_url obligatoire, pas de contrainte sur lieu
CREATE OR REPLACE FUNCTION fn_masterclass_check_mode() RETURNS TRIGGER AS $$
DECLARE
    v_lieu_id INT4;
BEGIN
    SELECT lieu_id INTO v_lieu_id FROM programme_evenement WHERE id = NEW.evenement_id;
    IF NEW.mode_diffusion_id = 1 THEN -- Présentiel
        IF v_lieu_id IS NULL THEN
            RAISE EXCEPTION 'Masterclass présentielle : lieu obligatoire sur programme_evenement';
        END IF;
        IF NEW.meeting_url IS NOT NULL THEN
            RAISE EXCEPTION 'Masterclass présentielle : meeting_url doit être NULL';
        END IF;
    ELSIF NEW.mode_diffusion_id = 2 THEN -- Distanciel
        IF NEW.meeting_url IS NULL THEN
            RAISE EXCEPTION 'Masterclass distancielle : meeting_url obligatoire';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_masterclass_check_mode ON masterclass;
CREATE TRIGGER trg_masterclass_check_mode
    BEFORE INSERT OR UPDATE ON masterclass
    FOR EACH ROW EXECUTE FUNCTION fn_masterclass_check_mode();

-- masterclass_inscription -> masterclass.participants_count (tous rôles confondus)
CREATE OR REPLACE FUNCTION fn_masterclass_participants_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE masterclass SET participants_count = participants_count + 1 WHERE id = NEW.masterclass_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.is_deleted AND NOT OLD.is_deleted THEN
        UPDATE masterclass SET participants_count = participants_count - 1 WHERE id = NEW.masterclass_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_masterclass_participants_count ON masterclass_inscription;
CREATE TRIGGER trg_masterclass_participants_count
    AFTER INSERT OR UPDATE OF is_deleted ON masterclass_inscription
    FOR EACH ROW EXECUTE FUNCTION fn_masterclass_participants_count();

-- vote_public : dénormalise categorie_id depuis la candidature choisie
CREATE OR REPLACE FUNCTION fn_vote_public_set_categorie() RETURNS TRIGGER AS $$
BEGIN
    SELECT categorie_id INTO NEW.categorie_id FROM candidature WHERE id = NEW.candidature_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vote_public_set_categorie ON vote_public;
CREATE TRIGGER trg_vote_public_set_categorie
    BEFORE INSERT ON vote_public
    FOR EACH ROW EXECUTE FUNCTION fn_vote_public_set_categorie();

-- feature_profil -> profil.features_version (invalidation cache Redis
-- côté appli : voir prompt aff-api, comparaison de version à chaque check)
CREATE OR REPLACE FUNCTION fn_feature_profil_version() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE profil SET features_version = features_version + 1 WHERE id = OLD.profil_id;
        RETURN OLD;
    ELSE
        UPDATE profil SET features_version = features_version + 1 WHERE id = NEW.profil_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feature_profil_version ON feature_profil;
CREATE TRIGGER trg_feature_profil_version
    AFTER INSERT OR DELETE ON feature_profil
    FOR EACH ROW EXECUTE FUNCTION fn_feature_profil_version();

-- Nouvel utilisateur -> auto-abonnement à TOUS les canaux is_canal_general = TRUE
-- (canal "AFF Officiel", non quittable)
CREATE OR REPLACE FUNCTION fn_user_auto_join_canal_general() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO conversation_participant (conversation_id, user_id, joined_at)
    SELECT id, NEW.id, now() FROM conversation WHERE is_canal_general = TRUE
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_auto_join_canal_general ON "user";
CREATE TRIGGER trg_user_auto_join_canal_general
    AFTER INSERT ON "user"
    FOR EACH ROW EXECUTE FUNCTION fn_user_auto_join_canal_general();

-- ========================================
-- Données initiales (seed) — ON CONFLICT DO NOTHING
-- ========================================

INSERT INTO profil (id, libelle, code, created_at, is_deleted, created_by)
VALUES
    (1, 'Participant', 'PARTICIPANT', now(), false, 0),
    (2, 'Expert', 'EXPERT', now(), false, 0),
    (3, 'Modérateur', 'MODERATEUR', now(), false, 0),
    (4, 'Super Admin', 'SUPER_ADMIN', now(), false, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO statut_edition (id, libelle, code) VALUES
    (1, 'Brouillon', 'BROUILLON'),
    (2, 'Publiée', 'PUBLIEE'),
    (3, 'En cours', 'EN_COURS'),
    (4, 'Terminée', 'TERMINEE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO communaute (id, libelle, code, description, is_active, created_at, is_deleted) VALUES
    (1, 'Art', 'ART', 'Arts visuels, peinture, sculpture et art numérique', true, now(), false),
    (2, 'Musique', 'MUSIQUE', 'Afrobeats, jazz, musique traditionnelle et contemporaine', true, now(), false),
    (3, 'Cinéma', 'CINEMA', 'Films, documentaires, court-métrages africains', true, now(), false),
    (4, 'Mode', 'MODE', 'Couture africaine, textiles et design vestimentaire', true, now(), false),
    (5, 'Danse', 'DANSE', 'Danses traditionnelles et contemporaines africaines', true, now(), false),
    (6, 'Littérature', 'LITTERATURE', 'Littérature africaine, poésie et narration', true, now(), false),
    (7, 'Gastronomie', 'GASTRONOMIE', 'Cuisine africaine et patrimoine culinaire', false, now(), false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO statut_publication (id, libelle, code) VALUES
    (1, 'Publié', 'PUBLIE'),
    (2, 'En attente', 'EN_ATTENTE'),
    (3, 'Rejeté', 'REJETE'),
    (4, 'Signalé', 'SIGNALE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reaction_type (id, libelle, emoji, code) VALUES
    (1, 'Coeur', '❤️', 'HEART'),
    (2, 'Applaudissement', '👏', 'CLAP'),
    (3, 'Feu', '🔥', 'FIRE'),
    (4, 'Fête', '🎉', 'PARTY')
ON CONFLICT (id) DO NOTHING;

INSERT INTO cible_type (id, libelle, code) VALUES
    (1, 'Publication', 'PUBLICATION'),
    (2, 'Commentaire', 'COMMENTAIRE'),
    (3, 'Utilisateur', 'USER')
    -- futur : (4, 'Masterclass', 'MASTERCLASS'), (5, 'Message', 'MESSAGE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO severite (id, libelle, code) VALUES
    (1, 'Faible', 'FAIBLE'),
    (2, 'Moyen', 'MOYEN'),
    (3, 'Élevé', 'ELEVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO statut_signalement (id, libelle, code) VALUES
    (1, 'Ouvert', 'OUVERT'),
    (2, 'Résolu', 'RESOLU'),
    (3, 'Classé', 'CLASSE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO award_theme (id, libelle, code, ordre) VALUES
    (1, 'Image & Visuel', 'IMAGE_VISUEL', 1),
    (2, 'Son & Scène', 'SON_SCENE', 2),
    (3, 'Mode & Style', 'MODE_STYLE', 3),
    (4, 'Digital & Influence', 'DIGITAL_INFLUENCE', 4),
    (5, 'Architecture & Espace', 'ARCHITECTURE_ESPACE', 5),
    (6, 'Entrepreneuriat & Impact', 'ENTREPRENEURIAT_IMPACT', 6),
    (7, 'Catégories spéciales', 'CATEGORIES_SPECIALES', 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO statut_candidature (id, libelle, code) VALUES
    (1, 'Soumise', 'SOUMISE'),
    (2, 'En révision', 'EN_REVISION'),
    (3, 'Finaliste', 'FINALISTE'),
    (4, 'Rejetée', 'REJETEE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO media_type (id, libelle, code) VALUES
    (1, 'Image', 'IMAGE'),
    (2, 'Vidéo', 'VIDEO'),
    (3, 'PDF', 'PDF')
ON CONFLICT (id) DO NOTHING;

INSERT INTO type_evenement (id, libelle, code) VALUES
    (1, 'Cérémonie', 'CEREMONIE'),
    (2, 'Masterclass', 'MASTERCLASS'),
    (3, 'Atelier', 'ATELIER'),
    (4, 'Panel', 'PANEL'),
    (5, 'Autre', 'AUTRE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lieu (id, libelle, capacite) VALUES
    (1, 'Grande scène', NULL),
    (2, 'Salle A', 200),
    (3, 'Village Créatif', NULL),
    (4, 'Amphithéâtre', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mode_diffusion (id, libelle, code) VALUES
    (1, 'Présentiel', 'PRESENTIEL'),
    (2, 'Distanciel', 'DISTANCIEL')
ON CONFLICT (id) DO NOTHING;

INSERT INTO statut_masterclass (id, libelle, code) VALUES
    (1, 'En attente', 'EN_ATTENTE'),
    (2, 'En direct', 'EN_DIRECT'),
    (3, 'Terminée', 'TERMINEE'),
    (4, 'Annulée', 'ANNULEE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO masterclass_role (id, libelle, code) VALUES
    (1, 'Expert', 'EXPERT'),
    (2, 'Modérateur', 'MODERATEUR'),
    (3, 'Participant', 'PARTICIPANT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO conversation_type (id, libelle, code) VALUES
    (1, 'Direct', 'DIRECT'),
    (2, 'Groupe', 'GROUPE')
ON CONFLICT (id) DO NOTHING;

-- Compte système officiel (ancre pour is_officiel + créateur du canal général)
INSERT INTO "user" (id, nom, prenom, username, email, is_officiel, is_active, created_at, is_deleted)
VALUES (1, 'AFF', 'Officiel', 'aff_officiel', 'officiel@aff2026.ci', true, true, now(), false)
ON CONFLICT (id) DO NOTHING;

-- Canal général obligatoire, créé par le compte officiel
INSERT INTO conversation (id, type_id, nom, description, is_canal_general, created_by, created_at, is_deleted)
VALUES (1, 2, 'AFF Officiel', 'Canal officiel du festival', true, 1, now(), false)
ON CONFLICT (id) DO NOTHING;

-- Backfill : abonne tous les users déjà existants au canal général
-- (le trigger fn_user_auto_join_canal_general ne couvre que les FUTURS users)
INSERT INTO conversation_participant (conversation_id, user_id, joined_at)
SELECT 1, id, now() FROM "user"
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- ========================================
-- Resynchronisation des séquences SERIAL
-- ("user" et "conversation" reçoivent un id=1 manuel ci-dessus ; sans ce
-- resync, la séquence retenterait nextval()=1 et provoquerait un conflit
-- de clé sur la toute prochaine insertion applicative)
-- ========================================

SELECT setval(pg_get_serial_sequence('"user"', 'id'), COALESCE((SELECT MAX(id) FROM "user"), 1));
SELECT setval(pg_get_serial_sequence('conversation', 'id'), COALESCE((SELECT MAX(id) FROM conversation), 1));

COMMIT;

-- ========================================
-- Bloc 7 — OTP (vérification email)
-- ========================================

CREATE TABLE IF NOT EXISTS otp (
  id           SERIAL4 PRIMARY KEY,
  email        VARCHAR(255) NOT NULL,
  code         VARCHAR(6) NOT NULL,
  expires_at   TIMESTAMP NOT NULL,
  attempts     INT4 DEFAULT 0,
  is_verified  BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON otp (email);



-- Migration : remplace les contraintes UNIQUE sur user par des index partiels
-- (permet réinscription après soft-delete avec le même email/username/phone)
DO $$
BEGIN
  ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_email_key;
  ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_username_key;
  ALTER TABLE "user" DROP CONSTRAINT IF EXISTS ux_user_phone_numb;
END
$$;
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_email ON "user" (email) WHERE is_deleted = false;
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_username ON "user" (username) WHERE is_deleted = false;
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_phone_numb ON "user" (phone_numb) WHERE is_deleted = false;

-- ========================================
-- Publication media (images multiples)
-- ========================================
CREATE TABLE IF NOT EXISTS publication_media (
  id              SERIAL4 PRIMARY KEY,
  publication_id  INT4 REFERENCES publication(id),
  file_path       VARCHAR(255) NOT NULL,
  ordre           INT4 DEFAULT 0,
  is_deleted      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_publication_media_pub ON publication_media (publication_id);
