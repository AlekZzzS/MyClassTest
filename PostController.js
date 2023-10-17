import { client } from './db.js'

class PostController {
    async create(req, res) {
        try {
            const { teacherIds, title, days, firstDate, lessonsCount, lastDate } = req.body;

            if (!teacherIds || !title || !days || !firstDate || !(lessonsCount || lastDate)) {
                throw new Error('Некорректные входные данные');
            }

            if (lessonsCount && lessonsCount > 300) {
                throw new Error('Превышено ограничение по количеству занятий');
            }

            if (lastDate) {
                const startDate = new Date(firstDate);
                const endDate = new Date(lastDate);
                const oneYearLater = new Date(startDate);
                oneYearLater.setFullYear(startDate.getFullYear() + 1);

                if (endDate > oneYearLater) {
                    throw new Error('Превышено ограничение по периоду дат');
                }
            }

            const startDate = new Date(firstDate);
            const endDate = lastDate ? new Date(lastDate) : new Date(firstDate);

            if (endDate.getFullYear() - startDate.getFullYear() > 1) {
                throw new Error('Период создания занятий не может превышать 1 год');
            }
            const createdLessons = [];

            let currentDate = startDate;
            let createdCount = 0;

            while (currentDate <= endDate && (lessonsCount ? createdCount < lessonsCount : true)) {
                if (days.includes(currentDate.getDay())) {
                    const lessonResult = await client.query(
                        `INSERT INTO lessons (date, title, status) VALUES ($1, $2, $3) RETURNING id`,
                        [currentDate.toISOString(), title, 0]
                    );

                    const lessonId = lessonResult.rows[0].id;

                    for (const teacherId of teacherIds) {
                        await client.query(
                            `INSERT INTO lesson_teachers (lesson_id, teacher_id) VALUES ($1, $2)`,
                            [lessonId, teacherId]
                        );
                    }

                    createdLessons.push(lessonId);
                    createdCount++;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            res.json({ createdLessons });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async get(req, res) {
        try {
            const { date, status, teacherIds, studentsCount, page = 1, lessonsPerPage = 5 } = req.query;

            let query = `
                SELECT
                lessons.id,
                date,
                title,
                status,
                COUNT(lesson_students) as "visitCount"
                FROM lessons
                LEFT JOIN lesson_teachers ON lessons.id = lesson_teachers.lesson_id
                LEFT JOIN (
                SELECT lesson_id, COUNT(*) FROM lesson_students GROUP BY lesson_id
                ) as lesson_students ON lessons.id = lesson_students.lesson_id
                WHERE 1 = 1
            `;

          const values = [];

            if (date) {
                const dates = date.split(',');
                if (dates.length === 1) {
                    query += ` AND date = $${values.push(dates[0])}`;
                } else if (dates.length === 2) {
                    query += ` AND date >= $${values.push(dates[0])} AND date <= $${values.push(dates[1])}`;
                }
            }

            if (status !== undefined) {
                query += ` AND status = $${values.push(status)}`;
            }

            if (teacherIds) {
                const teacherIdsArr = teacherIds.split(',').map(Number);
                query += ` AND lesson_teachers.teacher_id = ANY($${values.push(teacherIdsArr)})`;
            }

            if (studentsCount) {
                const [minCount, maxCount] = studentsCount.split(',').map(Number);
                query += `
                    HAVING COUNT(lesson_students) >= $${values.push(minCount)}
                    AND COUNT(lesson_students) <= $${values.push(maxCount || Infinity)}
                `;
            }

          query += `
                GROUP BY lessons.id
                OFFSET $${values.push((page - 1) * lessonsPerPage)}
                LIMIT $${values.push(lessonsPerPage)};
            `;

            const result = await client.query(query, values);

            const formattedData = [];

            for (const row of result.rows) {
                const lessonId = row.id;

                const studentsResult = await client.query(
                    `SELECT students.id, students.name, lesson_students.visit
                        FROM students
                        JOIN lesson_students ON students.id = lesson_students.student_id
                        WHERE lesson_students.lesson_id = $1
                    `,
                    [lessonId]
                );

                const teachersResult = await client.query(
                    `SELECT teachers.id, teachers.name
                        FROM teachers
                        JOIN lesson_teachers ON teachers.id = lesson_teachers.teacher_id
                        WHERE lesson_teachers.lesson_id = $1
                    `,
                    [lessonId]
                );

                const formattedLesson = {
                    id: lessonId,
                    date: row.date,
                    title: row.title,
                    status: row.status,
                    visitCount: row.visitCount,
                    students: studentsResult.rows,
                    teachers: teachersResult.rows
                };

                formattedData.push(formattedLesson);
            }

            res.json(formattedData);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

export default new PostController();