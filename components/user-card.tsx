import * as React from 'react';
import { Card } from './ui/card';
import moment from 'moment';
import { CheckCircle, NotepadText, PercentCircle } from 'lucide-react';
import 'moment/locale/ru'

moment.locale('ru')

export const UserCard = ({user}: {user: any}) => {
  return (
    <Card>
          <div className='flex justify-between space-x-10'>
            <div>
              <h1 className='font-bold text-2xl'>{user.name}</h1>
              <h1 className='text-lg mb-3'>{user.username}</h1>
              <h1 className='text-base'>Создан {moment(user.createdAt).format('LLL')}</h1>
              <h1 className='text-base'>Группа: {user.topicGroup.name}</h1>
            </div>
            <div className='flex gap-4 text-xl flex-wrap content-center'>
              <div>
                <p>Очки</p>
                <div className='flex gap-2'>{user.score}<CheckCircle /></div>
                {/* <div className='flex gap-2'><CountUp duration={1} end={user.score} /><CheckCircle /></div> */}
              </div>
              <div>
                <p>Тесты</p>
                <div className='flex gap-2'>{user.testsCount}<NotepadText /></div>
                {/* <div className='flex gap-2'><CountUp duration={1} end={user.testsCount} /><NotepadText /></div> */}
              </div>
              <div>
                <p>Процент</p>
                <div className='flex gap-2'>{user.percent}<PercentCircle /></div>
                {/* <div className='flex gap-2'><CountUp duration={1} end={user.percent} /><PercentCircle /></div> */}
              </div>
            </div>
          </div>
        </Card>
  )
}
