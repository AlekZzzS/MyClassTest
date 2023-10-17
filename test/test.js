import chai from 'chai';
import chaiHttp from 'chai-http';
import { app } from '../index.js'; // Путь к вашему основному файлу

chai.use(chaiHttp);
const expect = chai.expect;

describe('GET /', () => {
    it('should return an array of lessons', (done) => {
        chai.request(app)
        .get('/')
        .end((err, res) => {
            expect(res).to.have.status(200);
            expect(res.body).to.be.an('array');
            done();
        });
    });
});

describe('POST /lessons', () => {
    it('should create lessons', (done) => {
        chai.request(app)
        .post('/lessons')
        .send({
            teacherIds: [1, 2],
            title: 'PINK Ocean',
            days: [0, 1],
            firstDate: '2023-09-10',
            lessonsCount: 9
        })
        .end((err, res) => {
            expect(res).to.have.status(200);
            expect(res.body.createdLessons).to.be.an('array'); // Здесь изменение
            done();
        });
    });
});