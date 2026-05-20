import { type OrgId } from "@/lib/db/types";

import { getPrisma } from "./client";

const MULTI_TENANT_MODELS = new Set<string>([
  "Agent",
  "PhoneNumber",
  "KnowledgeDoc",
  "Call",
  "Transcript",
  "ToolCall",
  "CallEvent",
  "CallMetric",
  "CalcomConnection",
  "Campaign",
  "CampaignLead",
  "CampaignAttempt",
  "AuditLog",
  "Invite",
  "Membership",
]);

const READ_OR_MUTATE_OPS = new Set<string>([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
]);

const CREATE_ONE_OPS = new Set<string>(["create"]);
const CREATE_MANY_OPS = new Set<string>(["createMany", "createManyAndReturn"]);
const UPSERT_OPS = new Set<string>(["upsert"]);

type AnyArgs = Record<string, unknown>;

/**
 * Returns a Prisma client scoped to a single tenant.
 *
 * - Every read against a multi-tenant model gets `orgId` injected into the `where` clause.
 * - Every create / createMany / upsert gets `orgId` injected into the `data` payload.
 * - Single-tenant models (User, Organization) are not touched.
 *
 * This is the ONLY way the application code should query the database. Service-role
 * paths (e.g. webhook handlers that need to look up which tenant owns a phone number)
 * should use `getPrisma()` directly and pass the resolved `orgId` to `getDb` afterwards.
 */
export function getDb(orgId: OrgId) {
  return getPrisma().$extends({
    name: "with-org",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!MULTI_TENANT_MODELS.has(model)) {
            return query(args);
          }
          const a = (args ?? {}) as AnyArgs;

          if (READ_OR_MUTATE_OPS.has(operation)) {
            const where = (a.where as AnyArgs | undefined) ?? {};
            a.where = { ...where, orgId };
          } else if (CREATE_ONE_OPS.has(operation)) {
            const data = (a.data as AnyArgs | undefined) ?? {};
            a.data = { ...data, orgId };
          } else if (CREATE_MANY_OPS.has(operation)) {
            const data = a.data;
            if (Array.isArray(data)) {
              a.data = data.map((row) => ({ ...(row as AnyArgs), orgId }));
            } else if (data && typeof data === "object") {
              a.data = { ...(data as AnyArgs), orgId };
            }
          } else if (UPSERT_OPS.has(operation)) {
            const where = (a.where as AnyArgs | undefined) ?? {};
            const create = (a.create as AnyArgs | undefined) ?? {};
            const update = (a.update as AnyArgs | undefined) ?? {};
            a.where = { ...where, orgId };
            a.create = { ...create, orgId };
            a.update = { ...update };
          }
          return query(args);
        },
      },
    },
  });
}

export type ScopedDb = ReturnType<typeof getDb>;
