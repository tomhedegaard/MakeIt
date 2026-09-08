import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const login = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const da = JSON.parse(
  readFileSync(new URL("../../../messages/da/Login.json", import.meta.url), "utf8"),
) as {
  statusConnected: string;
  errors: { missing: string; need_invite: string };
  magic: { intro: string; inviteCodeLabel: string };
};
const en = JSON.parse(
  readFileSync(new URL("../../../messages/en/Login.json", import.meta.url), "utf8"),
) as {
  statusConnected: string;
  errors: { missing: string; need_invite: string };
  magic: { intro: string; inviteCodeLabel: string };
};

describe("login public status", () => {
  it("does not append env-derived Supabase project refs", () => {
    expect(login).not.toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(login).not.toMatch(/split\("\."\)\[0\]/);
  });

  it("keeps status copy as a short connected/demo label", () => {
    expect(da.statusConnected).toBe("Forbundet");
    expect(en.statusConnected).toBe("Connected");
    expect(da.statusConnected).not.toMatch(/·\s*$/);
    expect(en.statusConnected).not.toMatch(/·\s*$/);
  });
});

describe("login magic-link invite field", () => {
  it("does not require an invite on the magic-link form", () => {
    const magicForm = login.slice(
      login.indexOf("async function MagicLinkForm"),
      login.indexOf("async function PasswordForm"),
    );
    expect(magicForm).toContain('name="code"');
    expect(magicForm).not.toMatch(/name="code"[\s\S]*?\brequired\b/);
    expect(magicForm).toContain('name="email"');
    expect(magicForm).toMatch(/name="email"[\s\S]*?\brequired\b/);
  });

  it("tells returning members they can skip the invite", () => {
    expect(da.magic.intro).toMatch(/ny/i);
    expect(en.magic.intro).toMatch(/new account/i);
    expect(da.errors.missing).toMatch(/^Email/i);
    expect(en.errors.missing).toMatch(/^Email/i);
    expect(da.errors.need_invite).toMatch(/invite/i);
    expect(en.errors.need_invite).toMatch(/invite/i);
    expect(da.errors.missing).not.toMatch(/kode kræves/i);
    expect(en.errors.missing).not.toMatch(/and code/i);
  });
});
