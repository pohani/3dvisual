// App.js
import React, { useState, useRef, forwardRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
import './App.css';

// -----------------------------
// 1) Cylinder Component
// -----------------------------
const Cylinder = forwardRef(
  (
    {
      id,
      radiusTop,
      radiusBottom,
      height,
      rotation,
      position,
      materialType,
      onClick,
      isSelected,
    },
    ref
  ) => {
    // Use a refined pastel color palette
    // These colors are chosen so that they're different but harmonious:
    // Standard (default): pastel yellow, Basic: pastel peach,
    // Phong: pastel coral, Lambert: pastel pink.
    const getMaterial = (type) => {
      switch (type) {
        case 'basic':
          return <meshBasicMaterial color="#FAD7A0" />;
        case 'phong':
          return <meshPhongMaterial color="#F5CBA7" />;
        case 'lambert':
          return <meshLambertMaterial color="#FADBD8" />;
        default:
          return <meshStandardMaterial color="#F9E79F" />;
      }
    };

    return (
      <mesh
        ref={ref}
        rotation={rotation}
        position={position}
        onClick={(e) => {
          e.stopPropagation();
          onClick(id);
        }}
      >
        <cylinderGeometry args={[radiusTop, radiusBottom, height, 32]} />
        {getMaterial(materialType)}
        {/* Outline edges: thicker yellow outline for the selected cylinder */}
        <Edges
          threshold={15}
          color={isSelected ? "yellow" : "black"}
          lineWidth={isSelected ? 3 : 1}
        />
      </mesh>
    );
  }
);

// -----------------------------
// 2) Scene Component
// -----------------------------
function Scene({ cylinderProps, cylinderRefSetter, cylinderId, onSelect, isSelected }) {
  const meshRef = useRef();

  useEffect(() => {
    if (meshRef.current) {
      cylinderRefSetter(meshRef.current);
    }
  }, [meshRef, cylinderRefSetter]);

  return (
    <Cylinder
      id={cylinderId}
      {...cylinderProps}
      ref={meshRef}
      onClick={onSelect}
      isSelected={isSelected}
    />
  );
}

// -----------------------------
// 3) Main App Component
// -----------------------------
function App() {
  const [selectedCylinder, setSelectedCylinder] = useState('cylinder1');
  const [cylinderParams, setCylinderParams] = useState({
    cylinder1: {
      radiusTop: 1,
      radiusBottom: 1,
      height: 2,
      rotation: [0, 0, 0],
      position: [0, 0, 0],
      materialType: 'standard',
    },
    cylinder2: {
      radiusTop: 1,
      radiusBottom: 1,
      height: 2,
      rotation: [0, 0, 0],
      position: [2, 0, 0],
      materialType: 'standard',
    },
  });
  const [cylinderMeshes, setCylinderMeshes] = useState({});
  const fileInputRef = useRef(null);

  const addCylinder = () => {
    const count = Object.keys(cylinderParams).length;
    const newId = 'cylinder' + (count + 1);
    const defaultPosition = [count * 2, 0, 0];

    setCylinderParams((prev) => ({
      ...prev,
      [newId]: {
        radiusTop: 1,
        radiusBottom: 1,
        height: 2,
        rotation: [0, 0, 0],
        position: defaultPosition,
        materialType: 'standard',
      },
    }));
    setSelectedCylinder(newId);
  };

  const handleExport = () => {
    let exportString = '';
    let index = 1;
    for (const [id, params] of Object.entries(cylinderParams)) {
      const [posX, posY, posZ] = params.position;
      const [rotX, rotY] = params.rotation;
      const topDiameter = params.radiusTop * 2;
      const bottomDiameter = params.radiusBottom * 2;

      exportString += `rcc ${index} ${posX} ${posY} ${posZ} ${rotX} ${rotY} ${topDiameter} ${bottomDiameter}\n`;
      index++;
    }
    exportString += 'end body\n';
    index = 1;
    for (const id of Object.keys(cylinderParams)) {
      exportString += `zn${index} ${index}\n`;
      index++;
    }
    exportString += 'end zone\n';
    exportString += '1 2 2 1000 0\n';
    exportString += 'end geom\n';

    const blob = new Blob([exportString], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'model.txt';
    link.click();
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      let newCylinderParams = {};
      let index = 1;
      for (let line of lines) {
        line = line.trim();
        if (line.startsWith('rcc')) {
          const parts = line.split(/\s+/);
          if (parts.length >= 9) {
            const posX = parseFloat(parts[2]);
            const posY = parseFloat(parts[3]);
            const posZ = parseFloat(parts[4]);
            const rotX = parseFloat(parts[5]);
            const rotY = parseFloat(parts[6]);
            const topDiameter = parseFloat(parts[7]);
            const bottomDiameter = parseFloat(parts[8]);
            newCylinderParams[`cylinder${index}`] = {
              radiusTop: topDiameter / 2,
              radiusBottom: bottomDiameter / 2,
              height: 2,
              rotation: [rotX, rotY, 0],
              position: [posX, posY, posZ],
              materialType: 'standard',
            };
            index++;
          }
        }
      }
      if (Object.keys(newCylinderParams).length > 0) {
        setCylinderParams(newCylinderParams);
        setSelectedCylinder('cylinder1');
      } else {
        alert('No valid cylinder data found in the file.');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const updateParam = (key, value) => {
    setCylinderParams((prev) => ({
      ...prev,
      [selectedCylinder]: {
        ...prev[selectedCylinder],
        [key]: value,
      },
    }));
  };

  const updateRotation = (axisIndex, value) => {
    const newRotation = [...cylinderParams[selectedCylinder].rotation];
    newRotation[axisIndex] = value;
    setCylinderParams((prev) => ({
      ...prev,
      [selectedCylinder]: {
        ...prev[selectedCylinder],
        rotation: newRotation,
      },
    }));
  };

  const updatePosition = (axisIndex, value) => {
    const newPosition = [...cylinderParams[selectedCylinder].position];
    newPosition[axisIndex] = value;
    setCylinderParams((prev) => ({
      ...prev,
      [selectedCylinder]: {
        ...prev[selectedCylinder],
        position: newPosition,
      },
    }));
  };

  const updateMaterialType = (e) => {
    setCylinderParams((prev) => ({
      ...prev,
      [selectedCylinder]: {
        ...prev[selectedCylinder],
        materialType: e.target.value,
      },
    }));
  };

  const handleCylinderSelect = (cylinderId) => {
    setSelectedCylinder(cylinderId);
  };

  return (
    <div className="app-container">
      {/* Fixed Import/Export Buttons */}
      <div className="export-import-container">
        <button className="import-btn" onClick={handleImportClick}>
          Import
        </button>
        <button className="export-btn" onClick={handleExport}>
          Export All Cylinders
        </button>
      </div>
      <input
        type="file"
        accept=".txt"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFileImport}
      />

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Cylinder Controls</h2>
        </div>
        <div className="control-group">
          <label>Select Cylinder:</label>
          <select
            value={selectedCylinder}
            onChange={(e) => setSelectedCylinder(e.target.value)}
          >
            {Object.keys(cylinderParams).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        <div className="control-section">
          <h3>Geometry</h3>
          <div className="control-group">
            <label>Radius Top:</label>
            <input
              type="number"
              step="0.1"
              value={cylinderParams[selectedCylinder].radiusTop}
              onChange={(e) =>
                updateParam('radiusTop', parseFloat(e.target.value))
              }
            />
          </div>
          <div className="control-group">
            <label>Radius Bottom:</label>
            <input
              type="number"
              step="0.1"
              value={cylinderParams[selectedCylinder].radiusBottom}
              onChange={(e) =>
                updateParam('radiusBottom', parseFloat(e.target.value))
              }
            />
          </div>
          <div className="control-group">
            <label>Height:</label>
            <input
              type="number"
              step="0.1"
              value={cylinderParams[selectedCylinder].height}
              onChange={(e) =>
                updateParam('height', parseFloat(e.target.value))
              }
            />
          </div>
        </div>

        <div className="control-section">
          <h3>Rotation</h3>
          <div className="control-group">
            <label>Rotation X:</label>
            <input
              type="number"
              step="0.1"
              value={cylinderParams[selectedCylinder].rotation[0]}
              onChange={(e) =>
                updateRotation(0, parseFloat(e.target.value))
              }
            />
          </div>
          <div className="control-group">
            <label>Rotation Y:</label>
            <input
              type="number"
              step="0.1"
              value={cylinderParams[selectedCylinder].rotation[1]}
              onChange={(e) =>
                updateRotation(1, parseFloat(e.target.value))
              }
            />
          </div>
          <div className="control-group">
            <label>Rotation Z:</label>
            <input
              type="number"
              step="0.1"
              value={cylinderParams[selectedCylinder].rotation[2]}
              onChange={(e) =>
                updateRotation(2, parseFloat(e.target.value))
              }
            />
          </div>
        </div>

        <div className="control-section">
          <h3>Position</h3>
          <div className="control-group">
            <label>Offset X:</label>
            <input
              type="number"
              step="0.1"
              value={cylinderParams[selectedCylinder].position[0]}
              onChange={(e) =>
                updatePosition(0, parseFloat(e.target.value))
              }
            />
          </div>
          <div className="control-group">
            <label>Offset Y:</label>
            <input
              type="number"
              step="0.1"
              value={cylinderParams[selectedCylinder].position[1]}
              onChange={(e) =>
                updatePosition(1, parseFloat(e.target.value))
              }
            />
          </div>
          <div className="control-group">
            <label>Offset Z:</label>
            <input
              type="number"
              step="0.1"
              value={cylinderParams[selectedCylinder].position[2]}
              onChange={(e) =>
                updatePosition(2, parseFloat(e.target.value))
              }
            />
          </div>
        </div>

        <div className="control-section">
          <h3>Material</h3>
          <div className="control-group">
            <label>Material:</label>
            <select
              value={cylinderParams[selectedCylinder].materialType}
              onChange={updateMaterialType}
            >
              <option value="standard">Standard (Pastel Yellow)</option>
              <option value="basic">Basic (Pastel Peach)</option>
              <option value="phong">Phong (Pastel Coral)</option>
              <option value="lambert">Lambert (Pastel Pink)</option>
            </select>
          </div>
        </div>

        <div className="control-section actions">
          <button onClick={addCylinder}>Add Cylinder</button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="canvas-container">
        <Canvas camera={{ position: [0, 0, 10] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <OrbitControls />
          <axesHelper args={[5]} />
          {Object.entries(cylinderParams).map(([id, params]) => (
            <Scene
              key={id}
              cylinderId={id}
              cylinderProps={params}
              isSelected={id === selectedCylinder}
              cylinderRefSetter={(mesh) =>
                setCylinderMeshes((prev) => ({ ...prev, [id]: mesh }))
              }
              onSelect={handleCylinderSelect}
            />
          ))}
        </Canvas>
      </div>
    </div>
  );
}

export default App;
