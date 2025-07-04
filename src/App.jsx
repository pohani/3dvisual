// App.jsx
import React, { useState, useRef, forwardRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Edges, Wireframe, Text } from '@react-three/drei';
import './App.css';

// Reusable control: shows a label, a number input, and a slider.
function LabeledControl({ label, value, onChange, sliderMin, sliderMax, step, extraLabel }) {
  return (
    <div className="control-group">
      <label>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        step={step}
      />
      <input
        type="range"
        min={sliderMin}
        max={sliderMax}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        step={step}
      />
      {extraLabel && <span className="extra-label">{extraLabel}</span>}
    </div>
  );
}

// Shared material function for all 3D shapes
const getMaterial = (type) => {
  switch (type) {
    case 'concrete':
      return <meshBasicMaterial color="#8B8B8B" />; // Concrete Gray
    case 'steel':
      return <meshPhongMaterial color="#708090" />; // Steel Blue-Gray
    case 'wood':
      return <meshLambertMaterial color="#8B4513" />; // Wood Brown
    default:
      return <meshStandardMaterial color="#696969" />; // Default Metal Gray
  }
};

// Base Shape3D component with shared functionality
const Shape3D = forwardRef(
  (
    {
      id,
      position,
      materialType,
      onClick,
      isSelected,
      children,
      rotation,
      isSphere = false,
    },
    ref
  ) => {
    return (
      <mesh
        ref={ref}
        position={position}
        rotation={rotation}
        onClick={(e) => {
          e.stopPropagation();
          onClick(id);
        }}
      >
        {children}
        {getMaterial(materialType)}
        {isSphere ? (
          <Wireframe
            stroke={isSelected ? '#ab6036' : 'black'}
            thickness={isSelected ? 0.05 : 0.01}
          />
        ) : (
          <Edges
            threshold={0.01}
            color={isSelected ? '#ab6036' : 'black'}
            lineWidth={isSelected ? 5 : 1}
          />
        )}
      </mesh>
    );
  }
);

// Cylinder Component using the shared Shape3D base
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
    return (
      <Shape3D
        ref={ref}
        id={id}
        position={position}
        rotation={rotation}
        materialType={materialType}
        onClick={onClick}
        isSelected={isSelected}
      >
        <cylinderGeometry args={[radiusTop, radiusBottom, height, 32]} />
      </Shape3D>
    );
  }
);

// Sphere Component using the shared Shape3D base
const Sphere = forwardRef(
  (
    {
      id,
      radius,
      position,
      materialType,
      onClick,
      isSelected,
    },
    ref
  ) => {
    return (
      <Shape3D
        ref={ref}
        id={id}
        position={position}
        materialType={materialType}
        onClick={onClick}
        isSelected={isSelected}
        isSphere={true}
      >
        <sphereGeometry args={[radius, 32, 32]} />
      </Shape3D>
    );
  }
);

// Scene Component renders a cylinder and passes along the selection state.
function Scene({ cylinderProps, cylinderRefSetter, cylinderId, onSelect, isSelected }) {
  const meshRef = useRef();

  useEffect(() => {
    if (meshRef.current) {
      cylinderRefSetter(meshRef.current);
    }
  }, [meshRef, cylinderRefSetter]);

  const { rotation, ...restProps } = cylinderProps;
  const meshRotation = rotation.map((v) => v * Math.PI);
  return (
    <Cylinder
      id={cylinderId}
      {...restProps}
      rotation={meshRotation}
      ref={meshRef}
      onClick={onSelect}
      isSelected={isSelected}
    />
  );
}

// Scene Component for spheres
function SceneSphere({ sphereProps, sphereRefSetter, sphereId, onSelect, isSelected }) {
  const meshRef = useRef();

  useEffect(() => {
    if (meshRef.current) {
      sphereRefSetter(meshRef.current);
    }
  }, [meshRef, sphereRefSetter]);

  return (
    <Sphere
      id={sphereId}
      {...sphereProps}
      ref={meshRef}
      onClick={onSelect}
      isSelected={isSelected}
    />
  );
}

// Helper: Convert Euler angles (in radians) to a direction vector (unit vector along cylinder axis)
function eulerToDirection([rotX, rotY, rotZ]) {
  // Start with vector pointing up the Y axis
  let v = [0, 1, 0];
  // Apply X rotation
  let vy = v[1] * Math.cos(rotX) - v[2] * Math.sin(rotX);
  let vz = v[1] * Math.sin(rotX) + v[2] * Math.cos(rotX);
  let vx = v[0];
  // Apply Y rotation
  let vx2 = vx * Math.cos(rotY) + vz * Math.sin(rotY);
  let vz2 = -vx * Math.sin(rotY) + vz * Math.cos(rotY);
  let vy2 = vy;
  // Apply Z rotation
  let vx3 = vx2 * Math.cos(rotZ) - vy2 * Math.sin(rotZ);
  let vy3 = vx2 * Math.sin(rotZ) + vy2 * Math.cos(rotZ);
  let vz3 = vz2;
  // Normalize
  const len = Math.sqrt(vx3 * vx3 + vy3 * vy3 + vz3 * vz3);
  return [vx3 / len, vy3 / len, vz3 / len];
}

// Helper: Check if two cylinders are colliding
function checkCylinderCollision(cyl1, cyl2) {
  const [x1, y1, z1] = cyl1.position;
  const [x2, y2, z2] = cyl2.position;
  const r1 = cyl1.radiusTop;
  const r2 = cyl2.radiusTop;
  const h1 = cyl1.height;
  const h2 = cyl2.height;
  
  const dir1 = eulerToDirection(cyl1.rotation.map(v => v * Math.PI));
  const dir2 = eulerToDirection(cyl2.rotation.map(v => v * Math.PI));
  
  const start1 = [x1 - 0.5 * h1 * dir1[0], y1 - 0.5 * h1 * dir1[1], z1 - 0.5 * h1 * dir1[2]];
  const end1 = [x1 + 0.5 * h1 * dir1[0], y1 + 0.5 * h1 * dir1[1], z1 + 0.5 * h1 * dir1[2]];
  const start2 = [x2 - 0.5 * h2 * dir2[0], y2 - 0.5 * h2 * dir2[1], z2 - 0.5 * h2 * dir2[2]];
  const end2 = [x2 + 0.5 * h2 * dir2[0], y2 + 0.5 * h2 * dir2[1], z2 + 0.5 * h2 * dir2[2]];
  
  const axis1 = [end1[0] - start1[0], end1[1] - start1[1], end1[2] - start1[2]];
  const axis2 = [end2[0] - start2[0], end2[1] - start2[1], end2[2] - start2[2]];
  
  const cross = [
    axis1[1] * axis2[2] - axis1[2] * axis2[1],
    axis1[2] * axis2[0] - axis1[0] * axis2[2],
    axis1[0] * axis2[1] - axis1[1] * axis2[0]
  ];
  
  const crossMag = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]);
  
  if (crossMag < 0.001) {
    const centerDist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
    return centerDist < (r1 + r2);
  }
  
  const vec = [start2[0] - start1[0], start2[1] - start1[1], start2[2] - start1[2]];
  const dot1 = vec[0] * cross[0] + vec[1] * cross[1] + vec[2] * cross[2];
  const distance = Math.abs(dot1) / crossMag;
  
  return distance < (r1 + r2);
}

// Helper: Check for collisions between all objects
function detectCollisions(cylinderParams, sphereParams) {
  const collisions = [];
  const cylinderIds = Object.keys(cylinderParams);
  const sphereIds = Object.keys(sphereParams);
  
  // Check cylinder-cylinder collisions
  for (let i = 0; i < cylinderIds.length; i++) {
    for (let j = i + 1; j < cylinderIds.length; j++) {
      const id1 = cylinderIds[i];
      const id2 = cylinderIds[j];
      const cyl1 = cylinderParams[id1];
      const cyl2 = cylinderParams[id2];
      
      if (checkCylinderCollision(cyl1, cyl2)) {
        collisions.push([id1, id2]);
      }
    }
  }
  
  // Check sphere-sphere collisions
  for (let i = 0; i < sphereIds.length; i++) {
    for (let j = i + 1; j < sphereIds.length; j++) {
      const id1 = sphereIds[i];
      const id2 = sphereIds[j];
      const sph1 = sphereParams[id1];
      const sph2 = sphereParams[id2];
      
      if (checkSphereCollision(sph1, sph2)) {
        collisions.push([id1, id2]);
      }
    }
  }
  
  // Check cylinder-sphere collisions
  for (let i = 0; i < cylinderIds.length; i++) {
    for (let j = 0; j < sphereIds.length; j++) {
      const cylId = cylinderIds[i];
      const sphId = sphereIds[j];
      const cyl = cylinderParams[cylId];
      const sph = sphereParams[sphId];
      
      if (checkCylinderSphereCollision(cyl, sph)) {
        collisions.push([cylId, sphId]);
      }
    }
  }
  
  return collisions;
}

// Helper: Check if two spheres are colliding
function checkSphereCollision(sph1, sph2) {
  const [x1, y1, z1] = sph1.position;
  const [x2, y2, z2] = sph2.position;
  const r1 = sph1.radius;
  const r2 = sph2.radius;
  const epsilon = 0.01; // Small margin to avoid false positives
  const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
  return distance < (r1 + r2 - epsilon);
}

// Helper: Check if a cylinder and sphere are colliding
function checkCylinderSphereCollision(cyl, sph) {
  const [cx, cy, cz] = cyl.position;
  const [sx, sy, sz] = sph.position;
  const cylRadius = cyl.radiusTop;
  const sphRadius = sph.radius;
  const cylHeight = cyl.height;

  const dir = eulerToDirection(cyl.rotation.map(v => v * Math.PI));
  const start = [cx - 0.5 * cylHeight * dir[0], cy - 0.5 * cylHeight * dir[1], cz - 0.5 * cylHeight * dir[2]];
  const end = [cx + 0.5 * cylHeight * dir[0], cy + 0.5 * cylHeight * dir[1], cz + 0.5 * cylHeight * dir[2]];

  // Vector from cylinder start to sphere center
  const vec = [sx - start[0], sy - start[1], sz - start[2]];
  // Vector along cylinder axis
  const axis = [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
  const axisLength = Math.sqrt(axis[0] ** 2 + axis[1] ** 2 + axis[2] ** 2);

  // Project sphere center onto cylinder axis
  const t = (vec[0] * axis[0] + vec[1] * axis[1] + vec[2] * axis[2]) / (axisLength ** 2);
  const tClamped = Math.max(0, Math.min(1, t));

  // Closest point on cylinder axis to sphere center
  const closestPoint = [
    start[0] + tClamped * axis[0],
    start[1] + tClamped * axis[1],
    start[2] + tClamped * axis[2]
  ];

  // Distance from sphere center to closest point on cylinder axis
  const distToAxis = Math.sqrt(
    (sx - closestPoint[0]) ** 2 +
    (sy - closestPoint[1]) ** 2 +
    (sz - closestPoint[2]) ** 2
  );

  // If closest point is on the cap (tClamped == 0 or 1), check distance to cap center
  if (tClamped === 0 || tClamped === 1) {
    const capCenter = tClamped === 0 ? start : end;
    // Project sphere center onto the cap plane
    const axisNorm = [axis[0] / axisLength, axis[1] / axisLength, axis[2] / axisLength];
    const v = [sx - capCenter[0], sy - capCenter[1], sz - capCenter[2]];
    const distAlongAxis = v[0] * axisNorm[0] + v[1] * axisNorm[1] + v[2] * axisNorm[2];
    const proj = [
      sx - distAlongAxis * axisNorm[0],
      sy - distAlongAxis * axisNorm[1],
      sz - distAlongAxis * axisNorm[2]
    ];
    const radialDist = Math.sqrt(
      (proj[0] - capCenter[0]) ** 2 +
      (proj[1] - capCenter[1]) ** 2 +
      (proj[2] - capCenter[2]) ** 2
    );
    // If the projected point is within the cap disk, check vertical distance
    if (radialDist <= cylRadius) {
      return Math.abs(distAlongAxis) < sphRadius;
    } else {
      // Otherwise, check distance to the rim of the cap
      const rimDist = Math.sqrt((radialDist - cylRadius) ** 2 + distAlongAxis ** 2);
      return rimDist < sphRadius;
    }
  }

  // Otherwise, check side collision
  return distToAxis < (cylRadius + sphRadius);
}

// Main App Component
function App() {
  const [selectedObject, setSelectedObject] = useState('cylinder1');
  const [selectedObjectType, setSelectedObjectType] = useState('cylinder');
  const [cylinderParams, setCylinderParams] = useState({
    cylinder1: {
      radiusTop: 1,
      radiusBottom: 1,
      height: 2,
      rotation: [0, 0, 0],
      position: [0, 0, 0],
      materialType: 'concrete',
    },
    cylinder2: {
      radiusTop: 1,
      radiusBottom: 1,
      height: 2,
      rotation: [0, 0, 0],
      position: [2, 0, 0],
      materialType: 'concrete',
    },
  });
  const [sphereParams, setSphereParams] = useState({
    sphere1: {
      radius: 1,
      position: [4, 0, 0],
      materialType: 'concrete',
    },
  });
  const [cylinderMeshes, setCylinderMeshes] = useState({});
  const [sphereMeshes, setSphereMeshes] = useState({});
  const fileInputRef = useRef(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showAddObjectDropdown, setShowAddObjectDropdown] = useState(false);
  const [newObjectType, setNewObjectType] = useState('cylinder');

  const handleObjectSelect = (objectId, objectType) => {
    setSelectedObject(objectId);
    setSelectedObjectType(objectType);
  };

  // Update function for Radius
  const updateRadius = (value) => {
    if (selectedObjectType === 'cylinder') {
      setCylinderParams((prev) => ({
        ...prev,
        [selectedObject]: {
          ...prev[selectedObject],
          radiusTop: value,
          radiusBottom: value,
        },
      }));
    } else {
      setSphereParams((prev) => ({
        ...prev,
        [selectedObject]: {
          ...prev[selectedObject],
          radius: value,
        },
      }));
    }
  };

  // Add a new object (cylinder or sphere) with default parameters.
  const addObject = () => {
    if (newObjectType === 'cylinder') {
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
          materialType: 'concrete',
        },
      }));
      setSelectedObject(newId);
      setSelectedObjectType('cylinder');
    } else {
      const count = Object.keys(sphereParams).length;
      const newId = 'sphere' + (count + 1);
      const defaultPosition = [count * 2, 0, 0];

      setSphereParams((prev) => ({
        ...prev,
        [newId]: {
          radius: 1,
          position: defaultPosition,
          materialType: 'concrete',
        },
      }));
      setSelectedObject(newId);
      setSelectedObjectType('sphere');
    }
    setShowAddObjectDropdown(false);
  };

  // Exports objects to a text file.
  const handleExport = () => {
    const collisions = detectCollisions(cylinderParams, sphereParams);
    
    if (collisions.length > 0) {
      const collisionMessage = collisions.map(([id1, id2]) => 
        `${id1} and ${id2}`
      ).join(', ');
      
      const warningMessage = `⚠️ COLLISION WARNING ⚠️\n\nDetected collisions between: ${collisionMessage}\n\nObjects are intersecting and may cause issues in your model. Please adjust their positions or sizes before exporting.\n\nDo you want to export anyway?`;
      
      if (!window.confirm(warningMessage)) {
        return;
      }
    }
    
    const materialMap = {
      'concrete': 1,
      'steel': 2,
      'wood': 3,
      'standard': 4
    };
    
    let exportString = '';
    let index = 1;
    
    // Export cylinders
    for (const [id, params] of Object.entries(cylinderParams)) {
      const [centerX, centerY, centerZ] = params.position;
      const [rotX, rotY, rotZ] = params.rotation.map(v => v * Math.PI);
      const height = params.height;
      const radius = params.radiusTop;
      const [dx, dy, dz] = eulerToDirection([rotX, rotY, rotZ]);
      const bottomX = centerX - 0.5 * height * dx;
      const bottomY = centerY - 0.5 * height * dy;
      const bottomZ = centerZ - 0.5 * height * dz;
      const dirX = dx * height;
      const dirY = dy * height;
      const dirZ = dz * height;
      exportString += `rcc ${index} ${bottomX.toFixed(6)} ${bottomY.toFixed(6)} ${bottomZ.toFixed(6)} ${dirX.toFixed(6)} ${dirY.toFixed(6)} ${dirZ.toFixed(6)} ${radius.toFixed(6)}\n`;
      index++;
    }
    
    // Export spheres
    for (const [id, params] of Object.entries(sphereParams)) {
      const [centerX, centerY, centerZ] = params.position;
      const radius = params.radius;
      exportString += `sph ${index} ${centerX.toFixed(6)} ${centerY.toFixed(6)} ${centerZ.toFixed(6)} ${radius.toFixed(6)}\n`;
      index++;
    }
    
    exportString += 'end body\n';
    
    // Zone definitions
    index = 1;
    for (const [id, params] of Object.entries(cylinderParams)) {
      const materialInt = materialMap[params.materialType] || 1;
      exportString += `zn${index} 1 ${index}\n`;
      index++;
    }
    for (const [id, params] of Object.entries(sphereParams)) {
      const materialInt = materialMap[params.materialType] || 1;
      exportString += `zn${index} 1 ${index}\n`;
      index++;
    }
    exportString += 'end zone\n';
    
    // Material list per body
    index = 1;
    for (const [id, params] of Object.entries(cylinderParams)) {
      const materialInt = materialMap[params.materialType] || 1;
      exportString += `${materialInt} `;
      index++;
    }
    for (const [id, params] of Object.entries(sphereParams)) {
      const materialInt = materialMap[params.materialType] || 1;
      exportString += `${materialInt} `;
      index++;
    }
    
    exportString += '\noesnt worend geom\n';

    const blob = new Blob([exportString], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'model.qads';
    link.click();
    
    if (collisions.length > 0) {
      alert('⚠️ Export completed with collision warnings. Please review your model.');
    }
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
      let newSphereParams = {};
      let cylIndex = 1;
      let sphIndex = 1;
      let objectOrder = [];
      let materialList = [];
      let parsingMaterials = false;
      for (let line of lines) {
        line = line.trim();
        if (line.startsWith('rcc')) {
          const parts = line.split(/\s+/);
          if (parts.length >= 9) {
            const posX = parseFloat(parts[2]);
            const posY = parseFloat(parts[3]);
            const posZ = parseFloat(parts[4]);
            const dirX = parseFloat(parts[5]);
            const dirY = parseFloat(parts[6]);
            const dirZ = parseFloat(parts[7]);
            const radius = parseFloat(parts[8]);
            // Calculate center and rotation
            const height = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
            const centerX = posX + dirX / 2;
            const centerY = posY + dirY / 2;
            const centerZ = posZ + dirZ / 2;
            // Approximate rotation (not exact, but works for simple cases)
            const rotY = Math.atan2(dirX, dirZ) / Math.PI;
            const rotX = Math.atan2(Math.sqrt(dirX * dirX + dirZ * dirZ), dirY) / Math.PI;
            const id = `cylinder${cylIndex}`;
            newCylinderParams[id] = {
              radiusTop: radius,
              radiusBottom: radius,
              height: height,
              rotation: [rotX, rotY, 0],
              position: [centerX, centerY, centerZ],
              materialType: 'concrete', // will be updated after parsing materials
            };
            objectOrder.push({ type: 'cylinder', id });
            cylIndex++;
          }
        } else if (line.startsWith('sph')) {
          const parts = line.split(/\s+/);
          if (parts.length >= 6) {
            const posX = parseFloat(parts[2]);
            const posY = parseFloat(parts[3]);
            const posZ = parseFloat(parts[4]);
            const radius = parseFloat(parts[5]);
            const id = `sphere${sphIndex}`;
            newSphereParams[id] = {
              radius: radius,
              position: [posX, posY, posZ],
              materialType: 'concrete', // will be updated after parsing materials
            };
            objectOrder.push({ type: 'sphere', id });
            sphIndex++;
          }
        } else if (line.match(/^\d+(\s+\d+)*$/)) {
          // This is likely the material list line
          parsingMaterials = true;
          materialList = line.split(/\s+/).map(Number);
        }
      }
      // Map material numbers to types
      const materialMapReverse = {
        1: 'concrete',
        2: 'steel',
        3: 'wood',
        4: 'standard',
      };
      if (materialList.length > 0 && objectOrder.length === materialList.length) {
        materialList.forEach((matNum, idx) => {
          const obj = objectOrder[idx];
          const matType = materialMapReverse[matNum] || 'concrete';
          if (obj.type === 'cylinder') {
            newCylinderParams[obj.id].materialType = matType;
          } else if (obj.type === 'sphere') {
            newSphereParams[obj.id].materialType = matType;
          }
        });
      }
      if (Object.keys(newCylinderParams).length > 0 || Object.keys(newSphereParams).length > 0) {
        setCylinderParams(newCylinderParams);
        setSphereParams(newSphereParams);
        if (Object.keys(newCylinderParams).length > 0) {
          setSelectedObject('cylinder1');
          setSelectedObjectType('cylinder');
        } else if (Object.keys(newSphereParams).length > 0) {
          setSelectedObject('sphere1');
          setSelectedObjectType('sphere');
        }
      } else {
        alert('No valid cylinder or sphere data found in the file.');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  // Helpers to update other parameters.
  const updateParam = (key, value) => {
    if (selectedObjectType === 'cylinder') {
      setCylinderParams((prev) => ({
        ...prev,
        [selectedObject]: {
          ...prev[selectedObject],
          [key]: value,
        },
      }));
    } else {
      setSphereParams((prev) => ({
        ...prev,
        [selectedObject]: {
          ...prev[selectedObject],
          [key]: value,
        },
      }));
    }
  };

  const updateRotation = (axisIndex, value) => {
    if (selectedObjectType === 'cylinder') {
      const newRotation = [...cylinderParams[selectedObject].rotation];
      newRotation[axisIndex] = value;
      setCylinderParams((prev) => ({
        ...prev,
        [selectedObject]: {
          ...prev[selectedObject],
          rotation: newRotation,
        },
      }));
    }
  };

  const updatePosition = (axisIndex, value) => {
    if (selectedObjectType === 'cylinder') {
      const newPosition = [...cylinderParams[selectedObject].position];
      newPosition[axisIndex] = value;
      setCylinderParams((prev) => ({
        ...prev,
        [selectedObject]: {
          ...prev[selectedObject],
          position: newPosition,
        },
      }));
    } else {
      const newPosition = [...sphereParams[selectedObject].position];
      newPosition[axisIndex] = value;
      setSphereParams((prev) => ({
        ...prev,
        [selectedObject]: {
          ...prev[selectedObject],
          position: newPosition,
        },
      }));
    }
  };

  const updateMaterialType = (e) => {
    if (selectedObjectType === 'cylinder') {
      setCylinderParams((prev) => ({
        ...prev,
        [selectedObject]: {
          ...prev[selectedObject],
          materialType: e.target.value,
        },
      }));
    } else {
      setSphereParams((prev) => ({
        ...prev,
        [selectedObject]: {
          ...prev[selectedObject],
          materialType: e.target.value,
        },
      }));
    }
  };

  return (
    <div className="app-container">
      <div
        className="import-export-toggle"
        onClick={() => setShowImportExport(!showImportExport)}
      >
        {showImportExport ? '-' : '+'}
      </div>

      <div className={`export-import-container ${showImportExport ? 'active' : ''}`}>
        <button className="import-btn" onClick={handleImportClick}>
          Import
        </button>
        <button className="export-btn" onClick={handleExport}>
          Export All Objects
        </button>
      </div>
      <input
        type="file"
        accept=".qads"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFileImport}
      />

      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Object Controls</h2>
        </div>
        <div className="control-group">
          <label>Select Object:</label>
          <select
            value={selectedObject}
            onChange={(e) => {
              const newSelected = e.target.value;
              setSelectedObject(newSelected);
              if (cylinderParams[newSelected]) {
                setSelectedObjectType('cylinder');
              } else if (sphereParams[newSelected]) {
                setSelectedObjectType('sphere');
              }
            }}
          >
            {Object.keys(cylinderParams).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
            {Object.keys(sphereParams).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        <div className="control-section">
          <h3>Geometry</h3>
          <LabeledControl
            label="Radius:"
            value={selectedObjectType === 'cylinder' ? cylinderParams[selectedObject]?.radiusTop : sphereParams[selectedObject]?.radius}
            onChange={updateRadius}
            sliderMin={0.1}
            sliderMax={5}
            step={0.1}
          />
          {selectedObjectType === 'cylinder' && (
            <LabeledControl
              label="Height:"
              value={cylinderParams[selectedObject]?.height}
              onChange={(v) => updateParam('height', v)}
              sliderMin={0}
              sliderMax={20}
              step={0.1}
            />
          )}
        </div>

        {selectedObjectType === 'cylinder' && (
          <div className="control-section">
            <h3>Rotation</h3>
            <LabeledControl
              label="Rotation X:"
              value={cylinderParams[selectedObject]?.rotation[0]}
              onChange={(v) => updateRotation(0, v)}
              sliderMin={-1}
              sliderMax={1}
              step={0.01}
              extraLabel={"× π"}
            />
            <LabeledControl
              label="Rotation Y:"
              value={cylinderParams[selectedObject]?.rotation[1]}
              onChange={(v) => updateRotation(1, v)}
              sliderMin={-1}
              sliderMax={1}
              step={0.01}
              extraLabel={"× π"}
            />
            <LabeledControl
              label="Rotation Z:"
              value={cylinderParams[selectedObject]?.rotation[2]}
              onChange={(v) => updateRotation(2, v)}
              sliderMin={-1}
              sliderMax={1}
              step={0.01}
              extraLabel={"× π"}
            />
          </div>
        )}

        <div className="control-section">
          <h3>Position {selectedObjectType === 'cylinder' ? "(Center of object)" : "(Center of sphere)"}</h3>
          <LabeledControl
            label="Offset X:"
            value={selectedObjectType === 'cylinder' ? cylinderParams[selectedObject]?.position[0] : sphereParams[selectedObject]?.position[0]}
            onChange={(v) => updatePosition(0, v)}
            sliderMin={-20}
            sliderMax={20}
            step={0.1}
          />
          <LabeledControl
            label="Offset Y:"
            value={selectedObjectType === 'cylinder' ? cylinderParams[selectedObject]?.position[1] : sphereParams[selectedObject]?.position[1]}
            onChange={(v) => updatePosition(1, v)}
            sliderMin={-20}
            sliderMax={20}
            step={0.1}
          />
          <LabeledControl
            label="Offset Z:"
            value={selectedObjectType === 'cylinder' ? cylinderParams[selectedObject]?.position[2] : sphereParams[selectedObject]?.position[2]}
            onChange={(v) => updatePosition(2, v)}
            sliderMin={-20}
            sliderMax={20}
            step={0.1}
          />
        </div>

        <div className="control-section">
          <h3>Material</h3>
          <div className="control-group">
            <label>Material:</label>
            <select
              value={selectedObjectType === 'cylinder' ? cylinderParams[selectedObject]?.materialType : sphereParams[selectedObject]?.materialType}
              onChange={updateMaterialType}
            >
              <option value="standard">Metal (Gray)</option>
              <option value="concrete">Concrete (Gray)</option>
              <option value="steel">Steel (Blue-Gray)</option>
              <option value="wood">Wood (Brown)</option>
            </select>
          </div>
        </div>

        <div className="control-section actions">
          <button onClick={() => setShowAddObjectDropdown(true)}>Add Object</button>
        </div>
      </div>

      <div className="canvas-container">
        <Canvas camera={{ position: [0, 0, 10] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <OrbitControls />
          <axesHelper args={[5]} />
          {/* Axis Labels */}
          <Text
            position={[5.5, 0, 0]}
            fontSize={0.5}
            color="red"
            anchorX="center"
            anchorY="middle"
          >
            X
          </Text>
          <Text
            position={[0, 5.5, 0]}
            fontSize={0.5}
            color="green"
            anchorX="center"
            anchorY="middle"
          >
            Y
          </Text>
          <Text
            position={[0, 0, 5.5]}
            fontSize={0.5}
            color="blue"
            anchorX="center"
            anchorY="middle"
          >
            Z
          </Text>
          {Object.entries(cylinderParams).map(([id, params]) => (
            <Scene
              key={id}
              cylinderId={id}
              cylinderProps={params}
              isSelected={id === selectedObject}
              cylinderRefSetter={(mesh) =>
                setCylinderMeshes((prev) => ({ ...prev, [id]: mesh }))
              }
              onSelect={(id) => handleObjectSelect(id, 'cylinder')}
            />
          ))}
          {Object.entries(sphereParams).map(([id, params]) => (
            <SceneSphere
              key={id}
              sphereId={id}
              sphereProps={params}
              isSelected={id === selectedObject}
              sphereRefSetter={(mesh) =>
                setSphereMeshes((prev) => ({ ...prev, [id]: mesh }))
              }
              onSelect={(id) => handleObjectSelect(id, 'sphere')}
            />
          ))}
        </Canvas>
      </div>

      {showAddObjectDropdown && (
        <>
          <div className="modal-backdrop" onClick={() => setShowAddObjectDropdown(false)}></div>
          <div className="add-object-dropdown">
            <h3>Add New Object</h3>
            <select
              value={newObjectType}
              onChange={(e) => setNewObjectType(e.target.value)}
            >
              <option value="cylinder">Cylinder</option>
              <option value="sphere">Sphere</option>
            </select>
            <div className="dropdown-buttons">
              <button onClick={addObject}>Add</button>
              <button onClick={() => setShowAddObjectDropdown(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App; 