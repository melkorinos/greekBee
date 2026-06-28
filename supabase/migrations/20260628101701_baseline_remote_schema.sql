--
-- PostgreSQL database dump
--

\restrict kThGNYc2oUj2ZltIBdFGt906veYHxyOD2g3yClCPFq8NpXcfp3c0oADD1NFNvgS

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: community_leksiarxeio_puzzles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_leksiarxeio_puzzles (
    id bigint NOT NULL,
    submitter_name text DEFAULT ''::text NOT NULL,
    data jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.community_leksiarxeio_puzzles OWNER TO postgres;

--
-- Name: community_leksiarxeio_puzzles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.community_leksiarxeio_puzzles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.community_leksiarxeio_puzzles_id_seq OWNER TO postgres;

--
-- Name: community_leksiarxeio_puzzles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.community_leksiarxeio_puzzles_id_seq OWNED BY public.community_leksiarxeio_puzzles.id;


--
-- Name: community_leksindeseis_puzzles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_leksindeseis_puzzles (
    id bigint NOT NULL,
    submitter_name text DEFAULT ''::text NOT NULL,
    data jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.community_leksindeseis_puzzles OWNER TO postgres;

--
-- Name: community_leksindeseis_puzzles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.community_leksindeseis_puzzles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.community_leksindeseis_puzzles_id_seq OWNER TO postgres;

--
-- Name: community_leksindeseis_puzzles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.community_leksindeseis_puzzles_id_seq OWNED BY public.community_leksindeseis_puzzles.id;


--
-- Name: community_stavrolekso_puzzles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_stavrolekso_puzzles (
    id integer NOT NULL,
    title text,
    submitter_name text DEFAULT ''::text NOT NULL,
    edit_pin text NOT NULL,
    data jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.community_stavrolekso_puzzles OWNER TO postgres;

--
-- Name: community_stavrolekso_puzzles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.community_stavrolekso_puzzles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.community_stavrolekso_puzzles_id_seq OWNER TO postgres;

--
-- Name: community_stavrolekso_puzzles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.community_stavrolekso_puzzles_id_seq OWNED BY public.community_stavrolekso_puzzles.id;


--
-- Name: community_vrestifrasi_puzzles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_vrestifrasi_puzzles (
    id integer NOT NULL,
    submitter_name text DEFAULT ''::text NOT NULL,
    data jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.community_vrestifrasi_puzzles OWNER TO postgres;

--
-- Name: community_vrestifrasi_puzzles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.community_vrestifrasi_puzzles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.community_vrestifrasi_puzzles_id_seq OWNER TO postgres;

--
-- Name: community_vrestifrasi_puzzles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.community_vrestifrasi_puzzles_id_seq OWNED BY public.community_vrestifrasi_puzzles.id;


--
-- Name: game_scores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_scores (
    id bigint NOT NULL,
    game_id text NOT NULL,
    puzzle_date text NOT NULL,
    device_id text NOT NULL,
    display_name text DEFAULT 'Ανώνυμος'::text NOT NULL,
    score integer NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    auth_user_id uuid
);


ALTER TABLE public.game_scores OWNER TO postgres;

--
-- Name: game_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.game_scores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.game_scores_id_seq OWNER TO postgres;

--
-- Name: game_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.game_scores_id_seq OWNED BY public.game_scores.id;


--
-- Name: game_state; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_state (
    id bigint NOT NULL,
    device_uuid text NOT NULL,
    game_id text NOT NULL,
    puzzle_date text NOT NULL,
    state jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.game_state OWNER TO postgres;

--
-- Name: game_state_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.game_state_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.game_state_id_seq OWNER TO postgres;

--
-- Name: game_state_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.game_state_id_seq OWNED BY public.game_state.id;


--
-- Name: nomination_votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nomination_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nomination_id uuid NOT NULL,
    device_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    vote_type text DEFAULT 'up'::text NOT NULL,
    CONSTRAINT nomination_votes_vote_type_check CHECK ((vote_type = ANY (ARRAY['up'::text, 'down'::text])))
);


ALTER TABLE public.nomination_votes OWNER TO postgres;

--
-- Name: nominations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nominations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    word text NOT NULL,
    player_name text,
    note text,
    device_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    direction text DEFAULT 'add'::text NOT NULL,
    reviewed_at timestamp with time zone,
    CONSTRAINT word_suggestions_direction_check CHECK ((direction = ANY (ARRAY['add'::text, 'remove'::text]))),
    CONSTRAINT word_suggestions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])))
);


ALTER TABLE public.nominations OWNER TO postgres;

--
-- Name: player_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player_profiles (
    id bigint NOT NULL,
    display_name text NOT NULL,
    device_uuid text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_active timestamp with time zone DEFAULT now() NOT NULL,
    auth_user_id uuid
);


ALTER TABLE public.player_profiles OWNER TO postgres;

--
-- Name: player_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.player_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.player_profiles_id_seq OWNER TO postgres;

--
-- Name: player_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.player_profiles_id_seq OWNED BY public.player_profiles.id;


--
-- Name: transfer_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transfer_codes (
    code text NOT NULL,
    device_uuid text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
    used boolean DEFAULT false NOT NULL
);


ALTER TABLE public.transfer_codes OWNER TO postgres;

--
-- Name: community_leksiarxeio_puzzles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_leksiarxeio_puzzles ALTER COLUMN id SET DEFAULT nextval('public.community_leksiarxeio_puzzles_id_seq'::regclass);


--
-- Name: community_leksindeseis_puzzles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_leksindeseis_puzzles ALTER COLUMN id SET DEFAULT nextval('public.community_leksindeseis_puzzles_id_seq'::regclass);


--
-- Name: community_stavrolekso_puzzles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_stavrolekso_puzzles ALTER COLUMN id SET DEFAULT nextval('public.community_stavrolekso_puzzles_id_seq'::regclass);


--
-- Name: community_vrestifrasi_puzzles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_vrestifrasi_puzzles ALTER COLUMN id SET DEFAULT nextval('public.community_vrestifrasi_puzzles_id_seq'::regclass);


--
-- Name: game_scores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_scores ALTER COLUMN id SET DEFAULT nextval('public.game_scores_id_seq'::regclass);


--
-- Name: game_state id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_state ALTER COLUMN id SET DEFAULT nextval('public.game_state_id_seq'::regclass);


--
-- Name: player_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_profiles ALTER COLUMN id SET DEFAULT nextval('public.player_profiles_id_seq'::regclass);


--
-- Name: community_leksiarxeio_puzzles community_leksiarxeio_puzzles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_leksiarxeio_puzzles
    ADD CONSTRAINT community_leksiarxeio_puzzles_pkey PRIMARY KEY (id);


--
-- Name: community_leksindeseis_puzzles community_leksindeseis_puzzles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_leksindeseis_puzzles
    ADD CONSTRAINT community_leksindeseis_puzzles_pkey PRIMARY KEY (id);


--
-- Name: community_stavrolekso_puzzles community_stavrolekso_puzzles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_stavrolekso_puzzles
    ADD CONSTRAINT community_stavrolekso_puzzles_pkey PRIMARY KEY (id);


--
-- Name: community_vrestifrasi_puzzles community_vrestifrasi_puzzles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_vrestifrasi_puzzles
    ADD CONSTRAINT community_vrestifrasi_puzzles_pkey PRIMARY KEY (id);


--
-- Name: game_scores game_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_scores
    ADD CONSTRAINT game_scores_pkey PRIMARY KEY (id);


--
-- Name: game_scores game_scores_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_scores
    ADD CONSTRAINT game_scores_unique UNIQUE (game_id, device_id, puzzle_date);


--
-- Name: game_state game_state_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_state
    ADD CONSTRAINT game_state_pkey PRIMARY KEY (id);


--
-- Name: game_state game_state_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_state
    ADD CONSTRAINT game_state_unique UNIQUE (device_uuid, game_id, puzzle_date);


--
-- Name: nomination_votes nomination_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nomination_votes
    ADD CONSTRAINT nomination_votes_pkey PRIMARY KEY (id);


--
-- Name: player_profiles player_profiles_device_uuid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_profiles
    ADD CONSTRAINT player_profiles_device_uuid_key UNIQUE (device_uuid);


--
-- Name: player_profiles player_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_profiles
    ADD CONSTRAINT player_profiles_pkey PRIMARY KEY (id);


--
-- Name: transfer_codes transfer_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_codes
    ADD CONSTRAINT transfer_codes_pkey PRIMARY KEY (code);


--
-- Name: nominations word_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nominations
    ADD CONSTRAINT word_suggestions_pkey PRIMARY KEY (id);


--
-- Name: game_scores_auth_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX game_scores_auth_user_id_idx ON public.game_scores USING btree (auth_user_id) WHERE (auth_user_id IS NOT NULL);


--
-- Name: nomination_votes_nomination_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX nomination_votes_nomination_id_idx ON public.nomination_votes USING btree (nomination_id);


--
-- Name: player_profiles_auth_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX player_profiles_auth_user_id_key ON public.player_profiles USING btree (auth_user_id) WHERE (auth_user_id IS NOT NULL);


--
-- Name: game_scores game_scores_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_scores
    ADD CONSTRAINT game_scores_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);


--
-- Name: nomination_votes nomination_votes_nomination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nomination_votes
    ADD CONSTRAINT nomination_votes_nomination_id_fkey FOREIGN KEY (nomination_id) REFERENCES public.nominations(id) ON DELETE CASCADE;


--
-- Name: player_profiles player_profiles_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_profiles
    ADD CONSTRAINT player_profiles_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);


--
-- Name: nomination_votes Anyone can insert votes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can insert votes" ON public.nomination_votes FOR INSERT WITH CHECK (true);


--
-- Name: nominations Anyone can read pending nominations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read pending nominations" ON public.nominations FOR SELECT USING (true);


--
-- Name: nomination_votes Anyone can read votes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read votes" ON public.nomination_votes FOR SELECT USING (true);


--
-- Name: nomination_votes Device can delete its own votes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Device can delete its own votes" ON public.nomination_votes FOR DELETE USING (true);


--
-- Name: nomination_votes Device can update its own votes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Device can update its own votes" ON public.nomination_votes FOR UPDATE USING (true);


--
-- Name: game_state anon access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "anon access" ON public.game_state TO anon USING (true) WITH CHECK (true);


--
-- Name: transfer_codes anon access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "anon access" ON public.transfer_codes TO anon USING (true) WITH CHECK (true);


--
-- Name: community_stavrolekso_puzzles anon insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "anon insert" ON public.community_stavrolekso_puzzles FOR INSERT TO anon WITH CHECK (true);


--
-- Name: community_vrestifrasi_puzzles anon insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "anon insert" ON public.community_vrestifrasi_puzzles FOR INSERT TO anon WITH CHECK (true);


--
-- Name: community_stavrolekso_puzzles anon select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "anon select" ON public.community_stavrolekso_puzzles FOR SELECT TO anon USING (true);


--
-- Name: community_vrestifrasi_puzzles anon select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "anon select" ON public.community_vrestifrasi_puzzles FOR SELECT TO anon USING (true);


--
-- Name: community_leksiarxeio_puzzles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.community_leksiarxeio_puzzles ENABLE ROW LEVEL SECURITY;

--
-- Name: community_leksindeseis_puzzles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.community_leksindeseis_puzzles ENABLE ROW LEVEL SECURITY;

--
-- Name: community_stavrolekso_puzzles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.community_stavrolekso_puzzles ENABLE ROW LEVEL SECURITY;

--
-- Name: community_vrestifrasi_puzzles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.community_vrestifrasi_puzzles ENABLE ROW LEVEL SECURITY;

--
-- Name: game_scores; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: game_state; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;

--
-- Name: nominations insert only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "insert only" ON public.nominations FOR INSERT TO anon WITH CHECK (true);


--
-- Name: nomination_votes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.nomination_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: nominations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.nominations ENABLE ROW LEVEL SECURITY;

--
-- Name: player_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: player_profiles profile_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profile_insert ON public.player_profiles FOR INSERT WITH CHECK (true);


--
-- Name: player_profiles profile_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profile_select ON public.player_profiles FOR SELECT USING (true);


--
-- Name: player_profiles profile_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profile_update ON public.player_profiles FOR UPDATE USING (((auth_user_id IS NULL) OR (auth_user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: community_leksiarxeio_puzzles public insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "public insert" ON public.community_leksiarxeio_puzzles FOR INSERT TO anon WITH CHECK (true);


--
-- Name: community_leksindeseis_puzzles public insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "public insert" ON public.community_leksindeseis_puzzles FOR INSERT TO anon WITH CHECK (true);


--
-- Name: game_scores scores_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY scores_insert ON public.game_scores FOR INSERT WITH CHECK (true);


--
-- Name: game_scores scores_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY scores_select ON public.game_scores FOR SELECT USING (true);


--
-- Name: game_scores scores_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY scores_update ON public.game_scores FOR UPDATE USING (((auth_user_id IS NULL) OR (auth_user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: transfer_codes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.transfer_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: TABLE community_leksiarxeio_puzzles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.community_leksiarxeio_puzzles TO anon;
GRANT ALL ON TABLE public.community_leksiarxeio_puzzles TO authenticated;
GRANT ALL ON TABLE public.community_leksiarxeio_puzzles TO service_role;


--
-- Name: SEQUENCE community_leksiarxeio_puzzles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.community_leksiarxeio_puzzles_id_seq TO anon;
GRANT ALL ON SEQUENCE public.community_leksiarxeio_puzzles_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.community_leksiarxeio_puzzles_id_seq TO service_role;


--
-- Name: TABLE community_leksindeseis_puzzles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.community_leksindeseis_puzzles TO anon;
GRANT ALL ON TABLE public.community_leksindeseis_puzzles TO authenticated;
GRANT ALL ON TABLE public.community_leksindeseis_puzzles TO service_role;


--
-- Name: SEQUENCE community_leksindeseis_puzzles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.community_leksindeseis_puzzles_id_seq TO anon;
GRANT ALL ON SEQUENCE public.community_leksindeseis_puzzles_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.community_leksindeseis_puzzles_id_seq TO service_role;


--
-- Name: TABLE community_stavrolekso_puzzles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.community_stavrolekso_puzzles TO anon;
GRANT ALL ON TABLE public.community_stavrolekso_puzzles TO authenticated;
GRANT ALL ON TABLE public.community_stavrolekso_puzzles TO service_role;


--
-- Name: SEQUENCE community_stavrolekso_puzzles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.community_stavrolekso_puzzles_id_seq TO anon;
GRANT ALL ON SEQUENCE public.community_stavrolekso_puzzles_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.community_stavrolekso_puzzles_id_seq TO service_role;


--
-- Name: TABLE community_vrestifrasi_puzzles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.community_vrestifrasi_puzzles TO anon;
GRANT ALL ON TABLE public.community_vrestifrasi_puzzles TO authenticated;
GRANT ALL ON TABLE public.community_vrestifrasi_puzzles TO service_role;


--
-- Name: SEQUENCE community_vrestifrasi_puzzles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.community_vrestifrasi_puzzles_id_seq TO anon;
GRANT ALL ON SEQUENCE public.community_vrestifrasi_puzzles_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.community_vrestifrasi_puzzles_id_seq TO service_role;


--
-- Name: TABLE game_scores; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.game_scores TO anon;
GRANT ALL ON TABLE public.game_scores TO authenticated;
GRANT ALL ON TABLE public.game_scores TO service_role;


--
-- Name: SEQUENCE game_scores_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.game_scores_id_seq TO anon;
GRANT ALL ON SEQUENCE public.game_scores_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.game_scores_id_seq TO service_role;


--
-- Name: TABLE game_state; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.game_state TO anon;
GRANT ALL ON TABLE public.game_state TO authenticated;
GRANT ALL ON TABLE public.game_state TO service_role;


--
-- Name: SEQUENCE game_state_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.game_state_id_seq TO anon;
GRANT ALL ON SEQUENCE public.game_state_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.game_state_id_seq TO service_role;


--
-- Name: TABLE nomination_votes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.nomination_votes TO anon;
GRANT ALL ON TABLE public.nomination_votes TO authenticated;
GRANT ALL ON TABLE public.nomination_votes TO service_role;


--
-- Name: TABLE nominations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.nominations TO anon;
GRANT ALL ON TABLE public.nominations TO authenticated;
GRANT ALL ON TABLE public.nominations TO service_role;


--
-- Name: TABLE player_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.player_profiles TO anon;
GRANT ALL ON TABLE public.player_profiles TO authenticated;
GRANT ALL ON TABLE public.player_profiles TO service_role;


--
-- Name: SEQUENCE player_profiles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.player_profiles_id_seq TO anon;
GRANT ALL ON SEQUENCE public.player_profiles_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.player_profiles_id_seq TO service_role;


--
-- Name: TABLE transfer_codes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.transfer_codes TO anon;
GRANT ALL ON TABLE public.transfer_codes TO authenticated;
GRANT ALL ON TABLE public.transfer_codes TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict kThGNYc2oUj2ZltIBdFGt906veYHxyOD2g3yClCPFq8NpXcfp3c0oADD1NFNvgS

