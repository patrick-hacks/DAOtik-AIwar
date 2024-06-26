import React, { useEffect, useState } from 'react';
import { DAO } from '../types';

const DAOSelection: React.FC<{ onSelectDAO: (dao: DAO) => void }> = ({ onSelectDAO }) => {
  const [daos, setDaos] = useState<DAO[]>([]);

  useEffect(() => {
    const fetchDaos = async () => {
      try {
        const response = await fetch('/data/daos.json');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const daos = await response.json();
        console.log(daos); // Add this line to check if daos are fetched
        setDaos(daos);
      } catch (error) {
        console.error('Error fetching DAOs:', error);
      }
    };
    fetchDaos();
  }, []);

  return (
    <section className="p-8 w-5/6 mx-auto mt-24">
      <h1 className="text-2xl font-bold mb-6">Select a DAO</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {daos.map((dao) => (
          <div
            key={dao.id}
            className="dao-card p-8 bg-slate-700 rounded-lg shadow-md cursor-pointer hover:shadow-lg hover:shadow-slate-600 transition-shadow"
            onClick={() => onSelectDAO(dao)}
          >
            <img src={`${dao.image}`} alt={dao.name} className="rounded mb-4" />
            <p className="text-lg font-semibold">{dao.name}</p>
            <p className="text-sm">{dao.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DAOSelection;
