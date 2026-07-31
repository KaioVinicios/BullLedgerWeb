import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { TEST_API_URL } from "@/mocks/env";
import {
  archiveInstitution,
  createInstitution,
  listInstitutions,
  unarchiveInstitution,
  updateInstitution,
  type Institution,
} from "@/services/institutions";

const institution: Institution = {
  id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  name: "Nubank",
  kinds: ["BANK", "BROKERAGE"],
  country: "BR",
  is_self_custody: false,
  archived_at: null,
};

describe("listInstitutions", () => {
  it("passes ordering and include_archived through as query parameters", async () => {
    let url: URL | undefined;

    server.use(
      http.get(`${TEST_API_URL}/api/institutions/`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json({
          status: 200,
          data: {
            count: 1,
            next: null,
            previous: null,
            results: [institution],
          },
        });
      }),
    );

    const page = await listInstitutions({
      ordering: "-name",
      include_archived: true,
    });

    expect(url?.searchParams.get("ordering")).toBe("-name");
    expect(url?.searchParams.get("include_archived")).toBe("true");
    expect(page.results[0]?.kinds).toEqual(["BANK", "BROKERAGE"]);
  });
});

describe("createInstitution", () => {
  it("returns the created institution from inside the envelope", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/institutions/`, () =>
        HttpResponse.json({ status: 201, data: institution }, { status: 201 }),
      ),
    );

    const created = await createInstitution({
      name: "Nubank",
      kinds: ["BANK", "BROKERAGE"],
      country: "BR",
    });

    expect(created.id).toBe(institution.id);
  });
});

describe("updateInstitution", () => {
  it("PATCHes the detail path and unwraps the envelope", async () => {
    let patched: unknown;

    server.use(
      http.patch(
        `${TEST_API_URL}/api/institutions/${institution.id}/`,
        async ({ request }) => {
          patched = await request.json();
          return HttpResponse.json({
            status: 200,
            data: { ...institution, name: "Nu" },
          });
        },
      ),
    );

    const updated = await updateInstitution(institution.id, { name: "Nu" });

    expect(patched).toEqual({ name: "Nu" });
    expect(updated.name).toBe("Nu");
  });
});

describe("archiveInstitution / unarchiveInstitution", () => {
  it("POSTs to the dedicated sub-paths and unwraps the updated resource", async () => {
    const archivedAt = "2026-07-31T12:00:00Z";

    server.use(
      http.post(
        `${TEST_API_URL}/api/institutions/${institution.id}/archive/`,
        () =>
          HttpResponse.json({
            status: 200,
            data: { ...institution, archived_at: archivedAt },
          }),
      ),
      http.post(
        `${TEST_API_URL}/api/institutions/${institution.id}/unarchive/`,
        () => HttpResponse.json({ status: 200, data: institution }),
      ),
    );

    const archived = await archiveInstitution(institution.id);
    expect(archived.archived_at).toBe(archivedAt);

    const restored = await unarchiveInstitution(institution.id);
    expect(restored.archived_at).toBeNull();
  });
});
