"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface ApprovedDoctor {
  email: string;
  approvedAt: string;
  status: string;
}

export default function ApprovedDoctorsPanel() {
  const [doctors, setDoctors] = useState<ApprovedDoctor[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Fetch approved doctors
  const fetchDoctors = async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/approved-doctors");
      const data = await res.json();
      if (data.success) {
        setDoctors(data.doctors);
      }
    } catch (error) {
      toast.error("Failed to fetch approved doctors");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Add new approved doctor
  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) {
      toast.error("Email is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/approved-doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`${newEmail} added successfully`);
        setNewEmail("");
        fetchDoctors();
      } else {
        toast.error(data.error || "Failed to add doctor");
      }
    } catch (error) {
      toast.error("Error adding doctor");
    } finally {
      setLoading(false);
    }
  };

  // Remove approved doctor
  const handleRemoveDoctor = async (email: string) => {
    if (!confirm(`Remove ${email} from approved doctors?`)) return;

    try {
      const res = await fetch(`/api/admin/approved-doctors?email=${email}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`${email} removed`);
        fetchDoctors();
      } else {
        toast.error(data.error || "Failed to remove doctor");
      }
    } catch (error) {
      toast.error("Error removing doctor");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          Approved Doctors Management
        </h1>

        {/* Add Doctor Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Add New Approved Doctor
          </h2>
          <form onSubmit={handleAddDoctor} className="flex gap-2">
            <input
              type="email"
              placeholder="doctor@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add"}
            </button>
          </form>
        </div>

        {/* Doctors List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Approved Doctors ({doctors.length})
          </h2>

          {fetching ? (
            <p className="text-gray-500 text-center py-8">Loading...</p>
          ) : doctors.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No approved doctors yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Approved At
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr
                      key={doctor.email}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-gray-800">{doctor.email}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(doctor.approvedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          {doctor.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleRemoveDoctor(doctor.email)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 font-semibold text-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Test Email */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mt-8">
          <h3 className="font-semibold text-yellow-900 mb-2">📌 Quick Setup</h3>
          <p className="text-yellow-800 text-sm">
            Your test email: <strong>mbangwanaessengue@gmail.com</strong>
          </p>
          <p className="text-yellow-800 text-sm mt-2">
            Click "Add" above with your test email, then try enrolling in the app!
          </p>
        </div>
      </div>
    </div>
  );
}
