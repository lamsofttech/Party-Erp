-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 01, 2025 at 07:11 AM
-- Server version: 8.0.42
-- PHP Version: 8.3.22

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `wurnitky_dcp`
--

-- --------------------------------------------------------

--
-- Table structure for table `members`
--

CREATE TABLE `members` (
  `id` int NOT NULL,
  `membership_number` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gender` enum('Male','Female','Other') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `constituency` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ward` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `state_province` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_general_ci,
  `profile_photo_url` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `registration_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` varchar(50) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `members`
--

INSERT INTO `members` (`id`, `membership_number`, `full_name`, `email`, `phone_number`, `gender`, `date_of_birth`, `constituency`, `ward`, `state_province`, `remarks`, `profile_photo_url`, `registration_date`, `is_active`, `created_at`, `updated_at`, `status`) VALUES
(1, 'M001', 'John Doe', 'john.doe@example.com', '0712345678', 'Male', '1990-05-15', 'Westlands', 'Parklands', 'Nairobi', 'Youth League Representative', 'https://dummyimage.com/200x200/1e3a8a/ffffff.png&text=J', '2024-01-15', 1, '2025-07-19 16:29:33', '2025-07-19 17:28:46', 'approved'),
(2, 'M002', 'Jane Achieng', 'jane.achieng@example.com', '0729876543', 'Female', '1985-09-21', 'Langata', 'South C', 'Nairobi', 'Women Rep Candidate', 'https://dummyimage.com/200x200/1e3a8a/ffffff.png&text=J', '2024-02-10', 0, '2025-07-19 16:29:33', '2025-07-19 17:30:36', 'rejected'),
(3, 'M003', 'Peter Kamau', 'peter.kamau@example.com', '0711987654', 'Male', '1989-11-12', 'Embakasi East', 'Tassia', 'Nairobi', 'Digital Campaigner', NULL, '2024-03-11', 1, '2025-07-19 16:29:33', '2025-07-20 04:12:33', 'withdrawn'),
(4, 'M004', 'Fatuma Abdi', 'fatuma.abdi@example.com', '0700111222', 'Female', '1995-03-25', 'Garissa Township', 'Bulla', 'Garissa', 'Grassroot Organizer', NULL, '2024-04-05', 1, '2025-07-19 16:29:33', '2025-07-19 17:40:38', 'approved'),
(5, 'M005', 'Kiprono Sang', 'kiprono.sang@example.com', '0734567890', 'Male', '1992-08-30', 'Eldoret North', 'Kapsoya', 'Uasin Gishu', 'Young professionals rep', NULL, '2024-06-05', 1, '2025-07-19 16:29:33', '2025-07-20 04:11:40', 'withdrawn');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `members`
--
ALTER TABLE `members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `membership_number` (`membership_number`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `members`
--
ALTER TABLE `members`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
