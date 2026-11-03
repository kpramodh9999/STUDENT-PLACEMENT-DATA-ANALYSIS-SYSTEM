-- Student Placement Data Analysis System
-- Relational Database Schema (MySQL 8 / Relational SQL)

CREATE DATABASE IF NOT EXISTS `placement_system`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `placement_system`;

-- 1. Students Table
CREATE TABLE IF NOT EXISTS `students` (
    `student_id` INT AUTO_INCREMENT PRIMARY KEY,
    `roll_no` VARCHAR(50) NOT NULL UNIQUE,
    `student_name` VARCHAR(150) NOT NULL,
    `department` VARCHAR(100) NOT NULL,
    `sub_branch` VARCHAR(50) DEFAULT NULL,
    `graduation_year` INT NOT NULL,
    `eligible` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_students_department` (`department`),
    INDEX `idx_students_sub_branch` (`sub_branch`),
    INDEX `idx_students_grad_year` (`graduation_year`),
    INDEX `idx_students_eligible` (`eligible`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Skills Table
CREATE TABLE IF NOT EXISTS `skills` (
    `skill_id` INT AUTO_INCREMENT PRIMARY KEY,
    `skill_name` VARCHAR(100) NOT NULL UNIQUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Student-Skills Junction Table
CREATE TABLE IF NOT EXISTS `student_skills` (
    `student_id` INT NOT NULL,
    `skill_id` INT NOT NULL,
    PRIMARY KEY (`student_id`, `skill_id`),
    CONSTRAINT `fk_student_skills_student` 
        FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_student_skills_skill` 
        FOREIGN KEY (`skill_id`) REFERENCES `skills` (`skill_id`) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Placements Table (Allows multiple offers per student)
CREATE TABLE IF NOT EXISTS `placements` (
    `placement_id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `company` VARCHAR(150) NOT NULL,
    `role` VARCHAR(150) NOT NULL,
    `package_lpa` DECIMAL(6, 2) NOT NULL,
    `placement_date` DATE NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'Placed',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_placements_student` 
        FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_placements_company` (`company`),
    INDEX `idx_placements_package` (`package_lpa`),
    INDEX `idx_placements_date` (`placement_date`),
    INDEX `idx_placements_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Canonical Entity View matching prompt schema:
-- placements(placement_id, student_id, company, role, package, placement_date, status)
CREATE OR REPLACE VIEW `v_placements_canonical` AS
SELECT 
    `placement_id`,
    `student_id`,
    `company`,
    `role`,
    `package_lpa` AS `package`,
    `placement_date`,
    `status`
FROM `placements`;
