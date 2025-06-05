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
    numberOfSubjects: "",
    subjects: [],
    department: "College of Informatics and Computing Studies",
  });

  const [registered, setRegistered] = useState(false);
  const [warning, setWarning] = useState("");
  const navigate = useNavigate();

  const subjectOptions = [
    "Introduction to Programming",
    "Data Analytics",
    "Data Structures and Algorithms",
    "Human-Computer Interaction",
    "Application Development",
  ];
  const sectionOptions = ["4BSCS-1", "4BSCS-2"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear warning if subjects changed or numberOfSubjects changed
    if (name === "numberOfSubjects" || name === "subjects") setWarning("");
  };

  // Checkbox handler for subjects
  const handleSubjectCheckboxChange = (e) => {
    const { value, checked } = e.target;
    setFormData((prev) => {
      let updatedSubjects = [...prev.subjects];
      if (checked) {
        updatedSubjects.push(value);
      } else {
        updatedSubjects = updatedSubjects.filter((s) => s !== value);
      }
      return { ...prev, subjects: updatedSubjects };
    });
    setWarning("");
  };

  const validateForm = () => {
    // Check if numberOfSubjects is valid number between 1 and 5
    const numSubjects = parseInt(formData.numberOfSubjects, 10);
    if (!numSubjects || numSubjects < 1 || numSubjects > 5) {
      setWarning("Please enter a number of subjects between 1 and 5.");
      return false;
    }
    if (formData.subjects.length !== numSubjects) {
      setWarning(
        `Please select exactly ${numSubjects} subject${numSubjects > 1 ? "s" : ""}.`
      );
      return false;
    }
    return true;
  };

 const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

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
        numberOfSubjects: parseInt(formData.numberOfSubjects, 10),
        subjects: formData.subjects,
      }),
      ...(role === "professor" && {
        professorId: formData.professorId,
        numberOfSubjects: parseInt(formData.numberOfSubjects, 10),
        subjects: formData.subjects,
      }),
    };

    await setDoc(userDocRef, userData);
    setRegistered(true);
    alert("Account successfully created! Proceed to facial registration.");
    navigate("/face-registration", { state: { user } }); // Pass user as state
  } catch (error) {
    
  }
};


  const subjectCount = parseInt(formData.numberOfSubjects, 10);

  if (registered)
    return (
      <FaceRegistration
        user={user} // passing user info to FaceRegistration.jsx
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
    );

  const inputClasses = `w-full p-3 border rounded transition-colors duration-300 ${
    darkMode
      ? "bg-gray-700 text-white border-gray-600 placeholder-gray-400"
      : "bg-white text-black border-gray-300 placeholder-gray-600"
  }`;

  const checkboxLabelClasses = `inline-flex items-center mr-4 cursor-pointer ${
    darkMode ? "text-white" : "text-black"
  }`;

  return (
    <div
      className={`${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black"
      } min-h-screen flex items-center justify-center px-4 transition-colors duration-300`}
    >
      <div
        className={`relative shadow-xl rounded-2xl p-10 w-full max-w-2xl ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        {/* Dark mode toggle */}
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

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <h2 className="text-2xl font-bold mb-4 text-center">
            Complete Your Signup
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="firstName"
              placeholder="First Name"
              onChange={handleChange}
              className={inputClasses}
              required
              aria-required="true"
              aria-label="First Name"
            />
            <input
              name="lastName"
              placeholder="Last Name"
              onChange={handleChange}
              className={inputClasses}
              required
              aria-required="true"
              aria-label="Last Name"
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
                aria-required="true"
                aria-label="Student ID"
              />

              <div className="relative">
                <select
                  name="yearAndSection"
                  onChange={handleChange}
                  className={`${inputClasses} cursor-pointer appearance-none pr-8 relative`}
                  required
                  aria-required="true"
                  aria-label="Year and Section"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select Year and Section
                  </option>
                  {sectionOptions.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
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
                aria-required="true"
                aria-label="Number of Subjects"
              />

              {subjectCount > 0 && (
                <>
                  <label className="block mb-1 font-medium">
                    Select {subjectCount} Subject{subjectCount > 1 ? "s" : ""}
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                    {subjectOptions.map((subject) => (
                      <label
                        key={subject}
                        className={checkboxLabelClasses}
                        htmlFor={`subject-checkbox-${subject}`}
                      >
                        <input
                          id={`subject-checkbox-${subject}`}
                          type="checkbox"
                          name="subjects"
                          value={subject}
                          checked={formData.subjects.includes(subject)}
                          onChange={handleSubjectCheckboxChange}
                        />
                        <span className="ml-2">{subject}</span>
                      </label>
                    ))}
                  </div>
                  {warning && (
                    <p className="text-red-500 text-sm mt-1" role="alert">
                      {warning}
                    </p>
                  )}
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
                aria-required="true"
                aria-label="Professor ID"
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
                aria-required="true"
                aria-label="Number of Subjects"
              />

              {subjectCount > 0 && (
                <>
                  <label className="block mb-1 font-medium">
                    Select {subjectCount} Subject{subjectCount > 1 ? "s" : ""} You
                    Handle
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                    {subjectOptions.map((subject) => (
                      <label
                        key={subject}
                        className={checkboxLabelClasses}
                        htmlFor={`subject-checkbox-${subject}`}
                      >
                        <input
                          id={`subject-checkbox-${subject}`}
                          type="checkbox"
                          name="subjects"
                          value={subject}
                          checked={formData.subjects.includes(subject)}
                          onChange={handleSubjectCheckboxChange}
                        />
                        <span className="ml-2">{subject}</span>
                      </label>
                    ))}
                  </div>
                  {warning && (
                    <p className="text-red-500 text-sm mt-1" role="alert">
                      {warning}
                    </p>
                  )}
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
            aria-label="Department"
          />

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            aria-label="Submit form"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
