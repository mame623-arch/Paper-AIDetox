import { describe, expect, it } from "vitest";
import { classifyAttendance } from "./report";
import type { Attendance, Member, Paper } from "./types";

const m = (id: string, name: string, sort = 0): Member => ({
  id, name, role: "", sort, created_at: "",
});
const paper = (added_by: string): Paper => ({
  id: `p-${added_by}`, title: "t", authors: "", pdf_url: "", added_by,
  status: "read", read_date: null, session_id: "s1", created_at: "",
  category: "", published_year: null,
});
const att = (member_id: string, status: "present" | "absent", reason = ""): Attendance => ({
  id: `a-${member_id}`, session_id: "s1", member_id, status, reason, created_at: "",
});

const MEMBERS = [m("1", "가", 0), m("2", "나", 1), m("3", "다", 2), m("4", "라", 3)];

describe("classifyAttendance", () => {
  it("참석 체크한 사람은 참석자", () => {
    const r = classifyAttendance(MEMBERS, [], [att("1", "present")]);
    expect(r.present.map((x) => x.id)).toEqual(["1"]);
  });

  it("논문을 등록하면 체크가 없어도 참석자", () => {
    const r = classifyAttendance(MEMBERS, [paper("2")], []);
    expect(r.present.map((x) => x.id)).toEqual(["2"]);
  });

  it("불참 선언은 논문 등록보다 우선한다", () => {
    const r = classifyAttendance(MEMBERS, [paper("3")], [att("3", "absent", "출장")]);
    expect(r.present).toHaveLength(0);
    expect(r.absent).toEqual([{ member: MEMBERS[2], reason: "출장" }]);
  });

  it("나머지는 전부 응답 없음", () => {
    const r = classifyAttendance(MEMBERS, [paper("1")], [att("2", "absent", "감기")]);
    expect(r.noResponse.map((x) => x.id)).toEqual(["3", "4"]);
  });

  it("sort 순서를 지킨다", () => {
    const r = classifyAttendance(MEMBERS, [], [att("3", "present"), att("1", "present")]);
    expect(r.present.map((x) => x.id)).toEqual(["1", "3"]);
  });

  it("멤버 목록에 없는 id 는 무시한다", () => {
    const r = classifyAttendance(MEMBERS, [paper("999")], []);
    expect(r.present).toHaveLength(0);
    expect(r.noResponse).toHaveLength(4);
  });

  it("present 체크와 논문 등록이 함께 있어도 중복되지 않는다", () => {
    const r = classifyAttendance(MEMBERS, [paper("1")], [att("1", "present")]);
    expect(r.present).toHaveLength(1);
    expect(r.present[0].id).toBe("1");
  });
});
