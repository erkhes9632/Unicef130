"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { memberYears, members } from "@/db/schema";
import { actionError, fd, validationError, type ActionState } from "@/lib/admin/action-state";
import { diffFields, logActivity, shortId } from "@/lib/admin/activity";
import { refreshPublicPages, revalidatePublic } from "@/lib/admin/revalidate";
import { assertAdmin } from "@/lib/auth/session";
import { deleteMediaUrls } from "@/lib/media/server";
import { addToYear } from "@/lib/members/years";
import { displayYear, isSchoolYear } from "@/lib/school-year";
import { memberInputSchema } from "@/lib/validation/admin";

/** Public pages that show members' names. */
const NAME_PAGES = ["/members", "/about"];

const listUrl = (year: string) => `/admin/members?year=${encodeURIComponent(year)}&saved=1`;

/**
 * Saves the person (name, class, photo, team, e-mail, imported hours) and their membership in
 * the form's school year (group, position, «Нийтэд харуулах»). A new person joins that year.
 */
export async function saveMember(
  id: string | null,
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  let year = "";
  try {
    const user = await assertAdmin();
    const parsed = memberInputSchema.safeParse({
      name: fd.str(data, "name"),
      nameEn: fd.str(data, "nameEn"),
      role: fd.str(data, "role"),
      roleEn: fd.str(data, "roleEn"),
      className: fd.str(data, "className"),
      group: fd.str(data, "group") === "leadership" ? "leadership" : "member",
      photoUrl: fd.str(data, "photoUrl"),
      showPhoto: fd.bool(data, "showPhoto"),
      active: fd.bool(data, "active"),
      showPublicly: fd.bool(data, "showPublicly"),
      schoolYear: fd.str(data, "schoolYear"),
      volunteerHours: fd.str(data, "volunteerHours") === "" ? null : fd.int(data, "volunteerHours"),
      team: fd.str(data, "team"),
      email: fd.str(data, "email"),
    });
    if (!parsed.success) return validationError(parsed.error);
    const { group, role, roleEn, showPublicly, schoolYear, ...person } = parsed.data;
    year = schoolYear;
    const db = await getDb();
    const [prev] = id ? await db.select().from(members).where(eq(members.id, id)).limit(1) : [];
    if (id && !prev) return { ok: false, message: "Гишүүн олдсонгүй." };
    const [prevYear] = id
      ? await db
          .select()
          .from(memberYears)
          .where(and(eq(memberYears.memberId, id), eq(memberYears.schoolYear, year)))
          .limit(1)
      : [];
    // Turning a name public needs the parents' / guardians' consent, confirmed by the admin.
    const consentNow = showPublicly && !prevYear?.showPublicly;
    if (consentNow && !fd.bool(data, "consent"))
      return {
        ok: false,
        message:
          "Нэрийг нийтлэхийн өмнө эцэг эх / асран хамгаалагч зөвшөөрснийг баталгаажуулна уу.",
        fieldErrors: { consent: ["Зөвшөөрлийг баталгаажуулна уу."] },
      };
    const now = new Date();
    const yearFields = {
      role: group,
      position: role,
      positionEn: roleEn,
      showPublicly,
      ...(consentNow ? { consentConfirmedAt: now, consentConfirmedBy: user.id } : {}),
      updatedAt: now,
    };

    let memberId = id;
    if (id) {
      await db.update(members).set(person).where(eq(members.id, id));
      if (prev?.photoUrl && prev.photoUrl !== person.photoUrl)
        await deleteMediaUrls([prev.photoUrl]);
    } else {
      // A new person: the imported-hours year is the year they were added to.
      const [row] = await db
        .insert(members)
        .values({ ...person, schoolYear: year })
        .returning({ id: members.id });
      memberId = row!.id;
    }
    await addToYear(db, memberId!, year, group, role, roleEn);
    await db
      .update(memberYears)
      .set(yearFields)
      .where(and(eq(memberYears.memberId, memberId!), eq(memberYears.schoolYear, year)));

    await logActivity(user, id ? "member.update" : "member.create", {
      type: "member",
      id: memberId,
      summary: id
        ? `Гишүүн #${shortId(memberId!)} — мэдээллийг засав (${displayYear(year)})`
        : `Гишүүн #${shortId(memberId!)} нэмэв (${displayYear(year)})`,
      changes:
        id && prev
          ? diffFields(
              { ...prev, ...(prevYear ?? {}) },
              { ...person, role: group, position: role, showPublicly },
              [
                "name",
                "className",
                "role",
                "position",
                "active",
                "showPublicly",
                "showPhoto",
                "volunteerHours",
                "team",
              ],
              ["name", "className", "team"],
            )
          : undefined,
    });
    refreshPublicPages("members", NAME_PAGES);
  } catch (err) {
    return actionError(err);
  }
  redirect(listUrl(year));
}

/** Adds an existing person to another school year (as a member; edit the role there). */
export async function addMemberToYear(memberId: string, year: string): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    if (!isSchoolYear(year)) return { ok: false, message: "Хичээлийн жил буруу байна." };
    const db = await getDb();
    const [m] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.id, memberId), eq(members.anonymized, false)))
      .limit(1);
    if (!m) return { ok: false, message: "Гишүүн олдсонгүй." };
    await addToYear(db, memberId, year);
    await logActivity(user, "member.update", {
      type: "member",
      id: memberId,
      summary: `Гишүүн #${shortId(memberId)} — ${displayYear(year)} хичээлийн жилд нэмэв`,
    });
    revalidatePublic("members");
    return { ok: true, message: `${displayYear(year)} хичээлийн жилд нэмэгдлээ.` };
  } catch (err) {
    return actionError(err);
  }
}

/**
 * Removes a person from one school year's team (their other years, hours and the person stay).
 */
export async function removeFromYear(year: string, memberId: string): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    if (!isSchoolYear(year)) return { ok: false, message: "Хичээлийн жил буруу байна." };
    const db = await getDb();
    const res = await db
      .delete(memberYears)
      .where(and(eq(memberYears.memberId, memberId), eq(memberYears.schoolYear, year)))
      .returning({ id: memberYears.id });
    if (!res.length) return { ok: false, message: "Энэ жилд ийм гишүүн алга." };
    await logActivity(user, "member.update", {
      type: "member",
      id: memberId,
      summary: `Гишүүн #${shortId(memberId)} — ${displayYear(year)} оны багаас хасав`,
    });
    refreshPublicPages("members", NAME_PAGES);
    return { ok: true, message: `${displayYear(year)} оны багаас хасагдлаа.` };
  } catch (err) {
    return actionError(err);
  }
}

/** Deletes the person and every school year they were in (edit page, «Бүрмөсөн устгах»). */
export async function deleteMember(id: string): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const db = await getDb();
    const [row] = await db
      .delete(members)
      .where(eq(members.id, id))
      .returning({ photoUrl: members.photoUrl });
    if (!row) return { ok: false, message: "Гишүүн олдсонгүй." };
    await deleteMediaUrls([row.photoUrl]);
    await logActivity(user, "member.delete", {
      type: "member",
      id,
      summary: `Гишүүн #${shortId(id)} устгав`,
    });
    revalidatePublic("members");
    return { ok: true, message: "Гишүүн устгагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

/**
 * Show or hide names on the public site («Нийтэд харуулах») for one school year, for one member
 * or a selection. Members are mostly minors: showing needs the admin's confirmation that a
 * parent or guardian agreed (`consent`), recorded with the time and the admin. The pages are
 * refreshed at once.
 */
export async function setMembersPublic(
  year: string,
  ids: string[],
  show: boolean,
  consent: boolean,
): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    if (!isSchoolYear(year)) return { ok: false, message: "Хичээлийн жил буруу байна." };
    const list = ids.filter((v) => typeof v === "string" && v);
    if (list.length === 0) return { ok: false, message: "Гишүүн сонгоно уу." };
    if (list.length > 500) return { ok: false, message: "Хэт олон гишүүн сонгосон байна." };
    if (show && !consent)
      return {
        ok: false,
        message: "Эцэг эх / асран хамгаалагч зөвшөөрсөн эсэхийг баталгаажуулна уу.",
      };
    const db = await getDb();
    const now = new Date();
    const res = await db
      .update(memberYears)
      .set(
        show
          ? {
              showPublicly: true,
              consentConfirmedAt: now,
              consentConfirmedBy: user.id,
              updatedAt: now,
            }
          : { showPublicly: false, updatedAt: now },
      )
      .where(and(eq(memberYears.schoolYear, year), inArray(memberYears.memberId, list)))
      .returning({ id: memberYears.memberId });
    await logActivity(user, "member.update", {
      type: "member",
      id: res.length === 1 ? res[0]!.id : null,
      summary:
        (res.length === 1
          ? `Гишүүн #${shortId(res[0]!.id)} — нэрийг ${show ? "нийтэд харуулав (зөвшөөрөлтэй)" : "нийтээс нуув"}`
          : `${res.length} гишүүнийг ${show ? "нийтэд харуулав (зөвшөөрөлтэй)" : "нийтээс нуув"}`) +
        ` (${displayYear(year)})`,
    });
    refreshPublicPages("members", NAME_PAGES);
    return {
      ok: true,
      message: show
        ? res.length === 1
          ? "Нэр нийтэд харагдах боллоо"
          : `${res.length} гишүүний нэр нийтэд харагдах боллоо`
        : res.length === 1
          ? "Нэр нуугдлаа"
          : `${res.length} гишүүний нэр нуугдлаа`,
    };
  } catch (err) {
    return actionError(err);
  }
}

/** ↑ / ↓ in a school year's leadership order (swaps with the neighbour; no numbers to type). */
export async function moveMember(
  year: string,
  id: string,
  direction: "up" | "down",
): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    if (!isSchoolYear(year)) return { ok: false, message: "Хичээлийн жил буруу байна." };
    const db = await getDb();
    const [row] = await db
      .select()
      .from(memberYears)
      .where(and(eq(memberYears.memberId, id), eq(memberYears.schoolYear, year)))
      .limit(1);
    if (!row) return { ok: false, message: "Гишүүн олдсонгүй." };
    const siblings = await db
      .select({ id: memberYears.id, sortOrder: memberYears.sortOrder })
      .from(memberYears)
      .innerJoin(members, eq(memberYears.memberId, members.id))
      .where(
        and(
          eq(memberYears.schoolYear, year),
          eq(memberYears.role, row.role),
          eq(members.anonymized, false),
        ),
      )
      .orderBy(asc(memberYears.sortOrder), asc(members.name));
    const i = siblings.findIndex((m) => m.id === row.id);
    const j = direction === "up" ? i - 1 : i + 1;
    const other = siblings[j];
    if (i < 0 || !other) return { ok: true };
    // Distinct positions first (imported rows may share a number), then swap.
    const order = siblings.map((m, k) => ({ id: m.id, sortOrder: k + 1 }));
    [order[i]!.sortOrder, order[j]!.sortOrder] = [order[j]!.sortOrder, order[i]!.sortOrder];
    const [first, ...rest] = order.map((m) =>
      db.update(memberYears).set({ sortOrder: m.sortOrder }).where(eq(memberYears.id, m.id)),
    );
    await db.batch([first!, ...rest]);
    await logActivity(user, "member.update", {
      type: "member",
      id,
      summary: `Гишүүн #${shortId(id)} — дарааллыг ${direction === "up" ? "дээшлүүлэв" : "доошлуулав"} (${displayYear(year)})`,
    });
    refreshPublicPages("members", NAME_PAGES);
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
