import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  BookOpen,
  DollarSign,
  Calendar,
  Filter,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ============================================
// STEP 1: ADD YOUR SUPABASE CREDENTIALS HERE
// ============================================
const SUPABASE_URL = "https://czzxxpgvlffohqnynidz.supabase.co"; // e.g., "https://xxxxx.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_wjl7J6pZflkeV5syHG8AJQ_yPo-fpsB"; // Your anon public key

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [customColumns, setCustomColumns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [studentFilters, setStudentFilters] = useState({
    status: "all",
    groupId: "all",
  });
  const [paymentFilters, setPaymentFilters] = useState({
    paid: "all",
    month: "all",
  });

  // Modals
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [studentsRes, groupsRes, paymentsRes, attendanceRes, columnsRes] =
        await Promise.all([
          supabase.from("students").select("*").order("id"),
          supabase.from("groups").select("*").order("id"),
          supabase
            .from("payments")
            .select("*")
            .order("date", { ascending: false }),
          supabase
            .from("attendance")
            .select("*")
            .order("date", { ascending: false }),
          supabase.from("custom_columns").select("*").order("id"),
        ]);

      if (studentsRes.data) setStudents(studentsRes.data);
      if (groupsRes.data) setGroups(groupsRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);
      if (attendanceRes.data) setAttendance(attendanceRes.data);
      if (columnsRes.data) setCustomColumns(columnsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Սխալ տվյալների բեռնման ժամանակ");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate unpaid payments for active students
  useEffect(() => {
    const generatePayments = async () => {
      const today = new Date();
      const currentMonth = today.toISOString().substring(0, 7);
      const currentDay = today.getDate();

      for (const student of students) {
        if (student.status === "active" && student.payment_day <= currentDay) {
          const hasPaymentThisMonth = payments.some(
            (p) =>
              p.student_id === student.id && p.date.startsWith(currentMonth)
          );

          if (!hasPaymentThisMonth) {
            const paymentDate = `${currentMonth}-${String(
              student.payment_day
            ).padStart(2, "0")}`;

            const { data, error } = await supabase
              .from("payments")
              .insert({
                student_id: student.id,
                amount: 200,
                date: paymentDate,
                paid: false,
              })
              .select();

            if (data && !error) {
              setPayments((prev) => [...prev, data[0]]);
            }
          }
        }
      }
    };

    if (students.length > 0 && payments.length >= 0) {
      generatePayments();
    }
  }, [students, payments]);

  const handleDeleteGroup = async (groupId) => {
    if (
      !window.confirm("Դուք համոզվա՞ծ եք, որ ցանկանում եք ջնջել այս խումբը:")
    ) {
      return;
    }

    const { error } = await supabase.from("groups").delete().eq("id", groupId);

    if (error) {
      alert("Սխալ խումբը ջնջելիս");
      console.error(error);
    } else {
      setGroups(groups.filter((g) => g.id !== groupId));
    }
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setShowAddGroup(true);
  };

  const handleAddStudent = async (student) => {
    const { data, error } = await supabase
      .from("students")
      .insert({
        name: student.name,
        phone: student.phone,
        status: student.status,
        join_date: student.joinDate,
        finish_date: student.finishDate,
        group_id: student.groupId,
        payment_day: student.paymentDay,
        custom_fields: student.customFields || {},
      })
      .select();

    if (error) {
      alert("Սխալ ուսանողին ավելացնելիս");
      console.error(error);
    } else if (data) {
      setStudents([...students, data[0]]);
      setShowAddStudent(false);
    }
  };

  const handleAddPayment = async (payment) => {
    const { data, error } = await supabase
      .from("payments")
      .insert({
        student_id: payment.studentId,
        amount: payment.amount,
        date: payment.date,
        paid: payment.paid,
      })
      .select();

    if (error) {
      alert("Սխալ վճարումն ավելացնելիս");
      console.error(error);
    } else if (data) {
      setPayments([...payments, data[0]]);
      setShowAddPayment(false);
    }
  };

  const handleAddGroup = async (group) => {
    if (editingGroup) {
      const { data, error } = await supabase
        .from("groups")
        .update({
          name: group.name,
          schedule: group.schedule,
          max_students: group.maxStudents,
        })
        .eq("id", editingGroup.id)
        .select();

      if (error) {
        alert("Սխալ խումբը թարմացնելիս");
        console.error(error);
      } else if (data) {
        setGroups(groups.map((g) => (g.id === editingGroup.id ? data[0] : g)));
        setShowAddGroup(false);
        setEditingGroup(null);
      }
    } else {
      const { data, error } = await supabase
        .from("groups")
        .insert({
          name: group.name,
          schedule: group.schedule,
          max_students: group.maxStudents,
        })
        .select();

      if (error) {
        alert("Սխալ խումբն ավելացնելիս");
        console.error(error);
      } else if (data) {
        setGroups([...groups, data[0]]);
        setShowAddGroup(false);
      }
    }
  };

  const handleAddColumn = async (column) => {
    const { data, error } = await supabase
      .from("custom_columns")
      .insert({
        name: column.name,
        type: column.type,
      })
      .select();

    if (error) {
      alert("Սխալ սյունակն ավելացնելիս");
      console.error(error);
    } else if (data) {
      setCustomColumns([...customColumns, data[0]]);
      setShowAddColumn(false);
    }
  };

  const handleUpdateStudent = async (id, field, value) => {
    const student = students.find((s) => s.id === id);
    const updatedFields = { ...student.custom_fields, [field]: value };

    const { error } = await supabase
      .from("students")
      .update({ custom_fields: updatedFields })
      .eq("id", id);

    if (error) {
      alert("Սխալ ուսանողին թարմացնելիս");
      console.error(error);
    } else {
      setStudents(
        students.map((s) =>
          s.id === id ? { ...s, custom_fields: updatedFields } : s
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Բեռնում...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Կրթական Կենտրոն Codebridge-ի CRM
          </h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <nav className="flex gap-2 mb-6 overflow-x-scroll no-scrollbar bg-white p-1 rounded-lg shadow-sm">
          {[
            { id: "dashboard", label: "Գլխավոր", icon: BookOpen },
            { id: "students", label: "Ուսանողներ", icon: Users },
            { id: "groups", label: "Խմբեր", icon: Calendar },
            { id: "payments", label: "Վճարումներ", icon: DollarSign },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "dashboard" && (
          <Dashboard
            students={students}
            groups={groups}
            payments={payments}
            attendance={attendance}
          />
        )}

        {activeTab === "students" && (
          <StudentsView
            students={students}
            groups={groups}
            filters={studentFilters}
            setFilters={setStudentFilters}
            onAddStudent={() => setShowAddStudent(true)}
            customColumns={customColumns}
            onAddColumn={() => setShowAddColumn(true)}
            onUpdateStudent={handleUpdateStudent}
          />
        )}

        {activeTab === "groups" && (
          <GroupsView
            groups={groups}
            students={students}
            onAddGroup={() => {
              setEditingGroup(null);
              setShowAddGroup(true);
            }}
            onEditGroup={handleEditGroup}
            onDeleteGroup={handleDeleteGroup}
          />
        )}

        {activeTab === "payments" && (
          <PaymentsView
            payments={payments}
            students={students}
            filters={paymentFilters}
            setFilters={setPaymentFilters}
            onAddPayment={() => setShowAddPayment(true)}
          />
        )}
      </div>

      {showAddStudent && (
        <AddStudentModal
          groups={groups}
          onClose={() => setShowAddStudent(false)}
          onAdd={handleAddStudent}
        />
      )}

      {showAddPayment && (
        <AddPaymentModal
          students={students.filter((s) => s.status === "active")}
          onClose={() => setShowAddPayment(false)}
          onAdd={handleAddPayment}
        />
      )}

      {showAddGroup && (
        <AddGroupModal
          onClose={() => {
            setShowAddGroup(false);
            setEditingGroup(null);
          }}
          onSave={handleAddGroup}
          editingGroup={editingGroup}
        />
      )}

      {showAddColumn && (
        <AddColumnModal
          onClose={() => setShowAddColumn(false)}
          onAdd={handleAddColumn}
        />
      )}
    </div>
  );
}

function Dashboard({ students, groups, payments, attendance }) {
  const stats = useMemo(() => {
    const today = new Date();
    const currentMonth = today.toISOString().substring(0, 7);

    const thisMonthPayments = payments.filter((p) =>
      p.date.startsWith(currentMonth)
    );

    const totalStudents = students.filter((s) => s.status === "active").length;
    const totalFinished = students.filter(
      (s) => s.status === "finished"
    ).length;
    const totalLeft = students.filter((s) => s.status === "left").length;

    const paidPayments = thisMonthPayments.filter((p) => p.paid);
    const unpaidPayments = thisMonthPayments.filter((p) => !p.paid);
    const totalIncome = paidPayments.reduce((sum, p) => sum + p.amount, 0);

    const groupStats = groups.map((group) => ({
      name: group.name,
      count: students.filter(
        (s) => s.group_id === group.id && s.status === "active"
      ).length,
      maxStudents: group.max_students,
    }));

    return {
      totalStudents,
      totalFinished,
      totalLeft,
      paidCount: paidPayments.length,
      unpaidCount: unpaidPayments.length,
      totalIncome,
      groupStats,
    };
  }, [students, groups, payments]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ակտիվ ուսանողներ"
          value={stats.totalStudents}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Ընդհանուր եկամուտ (Այս ամիս)"
          value={`${stats.totalIncome}`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Վճարված (Այս ամիս)"
          value={stats.paidCount}
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Չվճարված (Այս ամիս)"
          value={stats.unpaidCount}
          icon={DollarSign}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            Ուսանողներն ըստ կարգավիճակի
          </h3>
          <div className="space-y-3">
            <StatusBar
              label="Ակտիվ"
              count={stats.totalStudents}
              color="bg-green-500"
            />
            <StatusBar
              label="Ավարտած"
              count={stats.totalFinished}
              color="bg-blue-500"
            />
            <StatusBar
              label="Դուրս եկած"
              count={stats.totalLeft}
              color="bg-gray-500"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Ուսանողներն ըստ խմբերի</h3>
          <div className="space-y-3">
            {stats.groupStats.map((group) => (
              <div key={group.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{group.name}</span>
                  <span className="text-gray-600">
                    {group.count}/{group.maxStudents}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${(group.count / group.maxStudents) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentsView({
  students,
  groups,
  filters,
  setFilters,
  onAddStudent,
  customColumns,
  onAddColumn,
  onUpdateStudent,
}) {
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (filters.status !== "all" && student.status !== filters.status)
        return false;
      if (
        filters.groupId !== "all" &&
        student.group_id !== parseInt(filters.groupId)
      )
        return false;
      return true;
    });
  }, [students, filters]);

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Ուսանողներ</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={onAddColumn}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              <Plus size={18} />
              Ավելացնել սյունակ
            </button>
            <button
              onClick={onAddStudent}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <Plus size={18} />
              Ավելացնել ուսանող
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">Բոլոր կարգավիճակները</option>
            <option value="active">Ակտիվ</option>
            <option value="finished">Ավարտած</option>
            <option value="left">Դուրս եկած</option>
          </select>

          <select
            value={filters.groupId}
            onChange={(e) =>
              setFilters({ ...filters, groupId: e.target.value })
            }
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">Բոլոր խմբերը</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Անուն
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Հեռախոս
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Խումբ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Կարգավիճակ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Միանալու ամսաթիվ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ավարտելու ամսաթիվ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Վճարման օր
              </th>
              {customColumns.map((col) => (
                <th
                  key={col.name}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredStudents.map((student) => {
              const group = groups.find((g) => g.id === student.group_id);
              return (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{student.name}</td>
                  <td className="px-6 py-4 text-gray-600">{student.phone}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {group?.name || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={student.status} />
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {student.join_date}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {student.finish_date || "-"}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {student.payment_day}
                  </td>
                  {customColumns.map((col) => (
                    <td key={col.name} className="px-6 py-4">
                      <input
                        type="text"
                        value={student.custom_fields?.[col.name] || ""}
                        onChange={(e) =>
                          onUpdateStudent(student.id, col.name, e.target.value)
                        }
                        className="w-full px-2 py-1 border rounded text-sm"
                        placeholder={`Մուտքագրեք ${col.name}`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupsView({
  groups,
  students,
  onAddGroup,
  onEditGroup,
  onDeleteGroup,
}) {
  return (
    <div>
      <div className="flex justify-between gap-4 sm:gap-0 flex-col sm:flex-row items-center mb-6">
        <h2 className="text-xl font-semibold">Խմբեր</h2>
        <button
          onClick={onAddGroup}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          <Plus size={18} />
          Ավելացնել խումբ
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => {
          const groupStudents = students.filter(
            (s) => s.group_id === group.id && s.status === "active"
          );
          return (
            <div key={group.id} className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{group.name}</h3>
                <div className="flex gap-4 sm:gap-2 flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => onEditGroup(group)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Խմբագրել
                  </button>
                  <button
                    onClick={() => onDeleteGroup(group.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Ջնջել
                  </button>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">{group.schedule}</p>

              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Ուսանողներ</span>
                <span className="font-semibold">
                  {groupStudents.length}/{group.max_students}
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${
                      (groupStudents.length / group.max_students) * 100
                    }%`,
                  }}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Ուսանողներ՝</h4>
                <ul className="space-y-1">
                  {groupStudents.slice(0, 5).map((student) => (
                    <li key={student.id} className="text-sm text-gray-600">
                      • {student.name}
                    </li>
                  ))}
                  {groupStudents.length > 5 && (
                    <li className="text-sm text-gray-400">
                      + {groupStudents.length - 5} ևս
                    </li>
                  )}
                  {groupStudents.length === 0 && (
                    <li className="text-sm text-gray-400">
                      Ակտիվ ուսանողներ չկան
                    </li>
                  )}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaymentsView({
  payments,
  students,
  filters,
  setFilters,
  onAddPayment,
}) {
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      if (filters.paid !== "all" && payment.paid !== (filters.paid === "paid"))
        return false;
      if (filters.month !== "all") {
        const paymentMonth = payment.date.substring(0, 7);
        if (paymentMonth !== filters.month) return false;
      }
      return true;
    });
  }, [payments, filters]);

  const totalAmount = filteredPayments
    .filter((p) => p.paid)
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b">
        <div className="flex gap-4 sm:gap-0 flex-col sm:flex-row justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold">Վճարումներ</h2>
            <p className="text-sm text-gray-600 mt-1">
              Ընդհանուր վճարված՝ {totalAmount}դր.
            </p>
          </div>
          <button
            onClick={onAddPayment}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Plus size={18} />
            Ավելացնել վճարում
          </button>
        </div>

        <div className="flex gap-4 sm:gap-4 flex-col sm:flex-row gap-4">
          <select
            value={filters.paid}
            onChange={(e) => setFilters({ ...filters, paid: e.target.value })}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">Բոլոր վճարումները</option>
            <option value="paid">Վճարված</option>
            <option value="unpaid">Չվճարված</option>
          </select>

          <select
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">Բոլոր ամիսները</option>
            <option value="2024-12">Դեկտեմբեր 2024</option>
            <option value="2024-11">Նոյեմբեր 2024</option>
            <option value="2024-10">Հոկտեմբեր 2024</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ուսանող
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Գումար
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ամսաթիվ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Կարգավիճակ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredPayments.map((payment) => {
              const student = students.find((s) => s.id === payment.student_id);
              return (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">
                    {student?.name || "Անհայտ"}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {payment.amount}դր.
                  </td>
                  <td className="px-6 py-4 text-gray-600">{payment.date}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.paid
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {payment.paid ? "Վճարված" : "Չվճարված"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    emerald: "bg-emerald-500",
    red: "bg-red-500",
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`${colorClasses[color]} p-3 rounded-lg`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
    </div>
  );
}

function StatusBar({ label, count, color }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-gray-600">{count}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full`}
          style={{ width: `${Math.min(count * 20, 100)}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    active: "bg-green-100 text-green-800",
    finished: "bg-blue-100 text-blue-800",
    left: "bg-gray-100 text-gray-800",
  };

  const labels = {
    active: "Ակտիվ",
    finished: "Ավարտած",
    left: "Դուրս եկած",
  };

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function AddStudentModal({ groups, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    status: "active",
    joinDate: new Date().toISOString().split("T")[0],
    finishDate: null,
    groupId: groups[0]?.id || 1,
    paymentDay: 1,
    customFields: {},
  });

  const handleSubmit = () => {
    if (formData.name && formData.phone) {
      onAdd(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Ավելացնել նոր ուսանող</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Անուն</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Հեռախոս</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Խումբ</label>
            <select
              value={formData.groupId}
              onChange={(e) =>
                setFormData({ ...formData, groupId: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border rounded-md"
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Միանալու ամսաթիվ
            </label>
            <input
              type="date"
              required
              value={formData.joinDate}
              onChange={(e) =>
                setFormData({ ...formData, joinDate: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Վճարման օր (1-31)
            </label>
            <input
              type="number"
              required
              min="1"
              max="31"
              value={formData.paymentDay}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  paymentDay: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Չեղարկել
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Ավելացնել
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddPaymentModal({ students, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    studentId: students[0]?.id || "",
    amount: 200,
    date: new Date().toISOString().split("T")[0],
    paid: false,
  });

  const handleSubmit = () => {
    if (formData.studentId && formData.amount) {
      onAdd({ ...formData, studentId: parseInt(formData.studentId) });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Ավելացնել նոր վճարում</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ուսանող</label>
            <select
              value={formData.studentId}
              onChange={(e) =>
                setFormData({ ...formData, studentId: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Գումար</label>
            <input
              type="number"
              required
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ամսաթիվ</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="paid"
              checked={formData.paid}
              onChange={(e) =>
                setFormData({ ...formData, paid: e.target.checked })
              }
              className="rounded border-gray-300"
            />
            <label htmlFor="paid" className="text-sm font-medium">
              Նշել որպես վճարված
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Չեղարկել
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Ավելացնել վճարում
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddGroupModal({ onClose, onSave, editingGroup }) {
  const [formData, setFormData] = useState({
    name: editingGroup?.name || "",
    schedule: editingGroup?.schedule || "",
    maxStudents: editingGroup?.max_students || 10,
  });

  const handleSubmit = () => {
    if (formData.name && formData.schedule) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {editingGroup ? "Խմբագրել խումբը" : "Ավելացնել նոր խումբ"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Խմբի անուն</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Օրինակ՝ Անգլերեն սկսնակների համար"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Դասաժամեր</label>
            <input
              type="text"
              required
              value={formData.schedule}
              onChange={(e) =>
                setFormData({ ...formData, schedule: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Օրինակ՝ Երկ/Չոր 10:00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Ուսանողների առավելագույն քանակ
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.maxStudents}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxStudents: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Չեղարկել
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              {editingGroup ? "Պահպանել փոփոխությունները" : "Ավելացնել խումբ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddColumnModal({ onClose, onAdd }) {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    if (name) {
      onAdd({ name, type: "text" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-sm w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Ավելացնել սյունակ</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Սյունակի անուն
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Օրինակ՝ Ծննդյան օր"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Չեղարկել
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Ավելացնել սյունակ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
