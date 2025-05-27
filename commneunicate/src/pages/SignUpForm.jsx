import React, { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import FaceRegistration from "./FaceRegistration";
import { useNavigate } from "react-router-dom";

export default function SignUpForm({ user, role, darkMode, toggleDarkMode }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    studentId: "",
    professorId: "",
    yearAndSection: "",
    numberOfSubjects: 0,
    subjects: [],
    department: "College of Informatics and Computing Studies"
  });

  const [registered, setRegistered] = useState(false);
  const [warning, setWarning] = useState("");
  const navigate = useNavigate();

  const subjectOptions = [
    "Introduction to Programming",
    "Data Analytics",
    "Data Structures and Algorithms",
    "Human-Computer Interaction",
    "Application Development"
  ];

  const sectionOptions = ["4BSCS-1", "4BSCS-2"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubjectsChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
    if (selectedOptions.length > 5) {
      setWarning("⚠️ Do not exceed 5 subjects!");
    } else {
      setWarning("");
      setFormData({ ...formData, subjects: selectedOptions });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.subjects.length > 5) {
      alert("Please select no more than 5 subjects.");
      return;
    }

    try {
      const userDocRef = doc(db, "users", user.uid);

      const userData = {
        uid: user.uid,
        email: user.email,
        photoURL: user.photoURL,
        role,
        firstName: formData.firstName,
        lastName: formData.lastName,
        createdAt: serverTimestamp(),
        department: formData.department,
        ...(role === "student" && {
          studentId: formData.studentId,
          yearAndSection: formData.yearAndSection,
          numberOfSubjects: formData.numberOfSubjects,
          subjects: formData.subjects
        }),
        ...(role === "professor" && {
          professorId: formData.professorId,
          numberOfSubjects: formData.numberOfSubjects,
          subjects: formData.subjects
        })
      };

      await setDoc(userDocRef, userData);
      setRegistered(true);

      alert("Account successfully created! Proceed to facial registration.");
      navigate("/face-registration");

    } catch (error) {
      console.error("Error writing document: ", error);
      alert("Error saving data");
    }
  };

  const subjectCount = parseInt(formData.numberOfSubjects, 10);

  if (registered) return <FaceRegistration user={user} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;

  // Inputs and selects styling with dark mode support
  const inputClasses = `w-full p-3 border rounded transition-colors duration-300 ${
    darkMode ? "bg-gray-700 text-white border-gray-600 placeholder-gray-400" : "bg-white text-black border-gray-300 placeholder-gray-600"
  }`;

  const selectClasses = inputClasses + " appearance-none pr-8 relative";

  return (
    <div className={`${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black"} min-h-screen flex items-center justify-center px-4 transition-colors duration-300`}>
      <div className={`relative shadow-xl rounded-2xl p-10 w-full max-w-2xl ${darkMode ? "bg-gray-800" : "bg-white"}`}>
        {/* Dark mode toggle button top-right */}
        <div
          className="absolute top-4 right-4 relative w-14 h-8 flex items-center bg-gray-300 rounded-full p-1 cursor-pointer"
          onClick={toggleDarkMode}
        >
          <div
            className={`bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ease-in-out flex items-center justify-center text-xs ${
              darkMode ? "translate-x-6" : "translate-x-0"
            }`}
          >
            {darkMode ? <span className="text-gray-800">🌙</span> : <span>☀️</span>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-2xl font-bold mb-4 text-center">Complete Your Signup</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="firstName"
              placeholder="First Name"
              onChange={handleChange}
              className={inputClasses}
              required
            />
            <input
              name="lastName"
              placeholder="Last Name"
              onChange={handleChange}
              className={inputClasses}
              required
            />
          </div>

          {role === "student" && (
            <>
              <input
                name="studentId"
                placeholder="Student ID"
                onChange={handleChange}
                className={inputClasses}
                required
              />

              <div className="relative">
                <select
                  name="yearAndSection"
                  onChange={handleChange}
                  className={`${selectClasses} cursor-pointer`}
                  required
                >
                  <option value="" disabled>
                    Select Year and Section
                  </option>
                  {sectionOptions.map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
                {/* Down arrow */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                  ▼
                </div>
              </div>

              <input
                type="number"
                name="numberOfSubjects"
                placeholder="How many subjects are you enrolled in? (1-5)"
                min="1"
                max="5"
                onChange={handleChange}
                className={inputClasses}
                required
              />

              {subjectCount > 0 && (
                <>
                  <label className="block text-left text-sm font-medium">Select {subjectCount} Subject(s)</label>
                  <select
                    multiple
                    onChange={handleSubjectsChange}
                    className={`${selectClasses} h-32`}
                    required
                  >
                    {subjectOptions.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  {warning && <p className="text-red-500 text-sm mt-1">{warning}</p>}
                  <p className="text-sm text-gray-500">(Hold Ctrl or Cmd to select multiple)</p>
                </>
              )}
            </>
          )}

          {role === "professor" && (
            <>
              <input
                name="professorId"
                placeholder="Professor ID"
                onChange={handleChange}
                className={inputClasses}
                required
              />

              <input
                type="number"
                name="numberOfSubjects"
                placeholder="How many subjects do you handle? (1-5)"
                min="1"
                max="5"
                onChange={handleChange}
                className={inputClasses}
                required
              />

              {subjectCount > 0 && (
                <>
                  <label className="block text-left text-sm font-medium">Select {subjectCount} Subject(s) You Handle</label>
                  <select
                    multiple
                    onChange={handleSubjectsChange}
                    className={`${selectClasses} h-32`}
                    required
                  >
                    {subjectOptions.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  {warning && <p className="text-red-500 text-sm mt-1">{warning}</p>}
                  <p className="text-sm text-gray-500">(Hold Ctrl or Cmd to select multiple)</p>
                </>
              )}
            </>
          )}

          <input
            type="text"
            name="department"
            value="College of Informatics and Computing Studies"
            readOnly
            className={`${inputClasses} bg-gray-300`}
          />

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
